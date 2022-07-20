import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { generateRandomString, sha1 } from '@powerfulyang/node-utils';
import { flatten, pick } from 'ramda';
import type { Profile } from 'passport';
import {
  firstItem,
  isArray,
  isDefined,
  isFalsy,
  isNotNull,
  isNull,
  isUndefined,
} from '@powerfulyang/utils';
import type { UserLoginDto } from '@/modules/user/dto/user-login.dto';
import { User } from '@/modules/user/entities/user.entity';
import { LoggerService } from '@/common/logger/logger.service';
import type { Menu } from '@/modules/user/entities/menu.entity';
import { RoleService } from '@/modules/user/role/role.service';
import { CacheService } from '@/common/cache/cache.service';
import { REDIS_KEYS } from '@/constants/REDIS_KEYS';
import { Family } from '@/modules/user/entities/family.entity';
import { OauthOpenidService } from '@/modules/oauth-openid/oauth-openid.service';
import { SUCCESS } from '@/constants/constants';
import type { SupportOauthApplication } from '@/modules/oauth-application/entities/oauth-application.entity';
import { MailService } from '@/common/service/MAIL/mail.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userDao: Repository<User>,
    @InjectRepository(Family)
    private readonly familyDao: Repository<Family>,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
    private readonly roleService: RoleService,
    private readonly cacheService: CacheService,
    private readonly oauthOpenidService: OauthOpenidService,
    private readonly mailService: MailService,
  ) {
    this.logger.setContext(UserService.name);
  }

  private static idMapping(data: any[]) {
    return data.reduce((draft, el, i) => {
      draft[el.id] = i;
      return draft;
    }, {});
  }

  private static buildTree(menus: Set<Menu>) {
    const menusArr = [...menus];
    const idMapping = UserService.idMapping(menusArr);
    const root: Menu[] = [];
    menusArr.forEach((menu) => {
      if (menu.parentId === 0) {
        return root.push(menu);
      }
      const parentEl = menusArr[idMapping[menu.parentId]];
      parentEl.children = [...parentEl.children, menu];
      return parentEl;
    });
    return root;
  }

  private static pickUserId(user: Partial<User>) {
    return pick(['id'], user);
  }

  private static verifyPassword(password: string, salt: string, saltedPassword: string) {
    const tmp = sha1(password, salt);
    return tmp === saltedPassword;
  }

  async initIntendedUsers() {
    const existedUsers = await this.userDao.find();
    const users: Partial<User>[] = Object.values(User.IntendedUsers)
      .filter((email) => {
        return isUndefined(existedUsers.find((existedUser) => existedUser.email === email));
      })
      .map((v) => ({
        nickname: v,
        email: v,
      }));
    await this.userDao.insert(users);
    return users;
  }

  async cacheUsers() {
    // 初始化用户缓存
    const keyCount = await this.cacheService.del(REDIS_KEYS.USERS);
    this.logger.debug(`初始化用户缓存，删除 ${keyCount} 个缓存`);
    const users = await this.queryUserCascadeFamilyInfo();
    const userMap = users.reduce((acc, user) => {
      Reflect.set(acc, user.id, JSON.stringify(user));
      return acc;
    }, {} as Record<string, User>);
    if (users.length) {
      const num = await this.cacheService.hset(REDIS_KEYS.USERS, userMap);
      this.logger.debug(`缓存 ${num} 个用户`);
    }
    return SUCCESS;
  }

  sendDefaultPassword(email: string, defaultPassword: string) {
    return this.mailService.sendMail(
      email,
      '欢迎加入 powerfulyang.com',
      `初始密码是：${defaultPassword}`,
    );
  }

  async dealLoginRequestFromOauthApplication<T extends Profile>(
    profile: T,
    platform: SupportOauthApplication,
  ) {
    const openid = profile.id;
    const o = await this.oauthOpenidService.findUserByOpenid(openid, platform);
    let user = o && o.user;
    const email = profile.emails && firstItem(profile.emails)?.value;
    const avatar = profile.photos && firstItem(profile.photos)?.value;
    if (isNull(user)) {
      if (isUndefined(email)) {
        throw new UnauthorizedException('Primary email is required!');
      }
      user = await this.getUserByEmail(email);
      if (isNotNull(user)) {
        // 关联新的 openid
        await this.oauthOpenidService.associateOpenid(user.id, openid, platform);
      } else {
        // 创建新用户
        user = this.userDao.create();
        user.email = email;
        user.avatar = avatar;
        user.nickname = profile.displayName;
        user = await this.initUserDefaultProperty(user);
        user = await this.saveUserAndCached(user);
        // 关联新的 openid
        await this.oauthOpenidService.associateOpenid(user.id, openid, platform);
        // salt 是默认密码
        await this.sendDefaultPassword(user.email, user.salt);
      }
    } else {
      // 更新头像
      const u = await this.getCachedUser(user.id);
      u.avatar = avatar;
      user = await this.saveUserAndCached(u);
    }
    return this.generateAuthorization(user);
  }

  generateAuthorization(user: Partial<User> & Pick<User, 'id'>) {
    return this.jwtService.signAsync(UserService.pickUserId(user));
  }

  verifyAuthorization(token: string) {
    return this.jwtService.verifyAsync<Pick<User, 'id'>>(token);
  }

  async queryMenusByUserId(id: User['id']) {
    const user = await this.userDao.findOneByOrFail({ id });
    const menus = new Set(flatten(user.roles.map((role) => role.menus)));
    return UserService.buildTree(menus);
  }

  /**
   * 使用邮箱密码登录
   * 密码为 null, 禁止登录
   * @param user - UserLoginDto
   */
  async login(user: UserLoginDto) {
    const { email, password } = user;
    const userInfo = await this.userDao.findOneOrFail({
      select: ['id', 'salt', 'saltedPassword'],
      where: { email, saltedPassword: Not('') },
    });
    const bool = UserService.verifyPassword(password, userInfo.salt, userInfo.saltedPassword);
    if (isFalsy(bool)) {
      throw new UnauthorizedException('密码错误！');
    }
    return this.generateAuthorization(userInfo);
  }

  getUserByEmail(email: string): Promise<User> {
    return this.userDao.findOneByOrFail({ email });
  }

  updateUserWithoutCache(id: User['id'], user: Partial<User>) {
    return this.userDao.update(id, user);
  }

  async updatePassword(id: User['id'], password?: string) {
    const salt = generateRandomString();
    const saltedPassword = this.generateSaltedPassword(salt, password || salt);
    const user = await this.userDao.findOneByOrFail({ id });
    user.salt = salt;
    user.saltedPassword = saltedPassword;
    return this.userDao.save(user);
  }

  queryUserCascadeFamilyInfo(): Promise<User[]>;

  queryUserCascadeFamilyInfo(id: User['id']): Promise<User>;

  queryUserCascadeFamilyInfo(ids: User['id'][]): Promise<User[]>;

  queryUserCascadeFamilyInfo(id?: User['id'] | User['id'][]): Promise<any> {
    if (isDefined(id)) {
      if (isArray(id)) {
        return this.userDao.find({
          where: { id: In(id) },
          relations: ['families', 'families.members'],
        });
      }
      return this.userDao.findOneOrFail({
        where: { id },
        relations: ['families', 'families.members'],
      });
    }
    return this.userDao.find({
      relations: ['families', 'families.members'],
    });
  }

  getCachedUser(id: User['id']) {
    return this.cacheService.hGetJSON<User>(REDIS_KEYS.USERS, id);
  }

  /**
   * 加入家庭，完全替换
   * @param userId
   * @param family - familyId or familyId[]
   * @param operation - 'add' | 'remove' | 'replace'
   */
  async setUserFamily(
    userId: User['id'],
    family: Family['id'] | Family['id'][],
    operation: 'add' | 'remove' | 'replace' = 'replace',
  ) {
    const user = await this.queryUserCascadeFamilyInfo(userId);
    let { families } = user;
    if (isArray(family)) {
      const result = await this.familyDao.find({ where: { id: In(family) } });
      if (operation === 'add') {
        families = [...families, ...result];
      } else if (operation === 'remove') {
        families = families.filter((f) => !family.includes(f.id));
      } else if (operation === 'replace') {
        families = result;
      }
    } else {
      const result = await this.familyDao.findOneByOrFail({ id: family });
      if (operation === 'add') {
        families = families.concat(result);
      } else if (operation === 'remove') {
        families = families.filter((f) => f.id !== family);
      } else if (operation === 'replace') {
        families = [result];
      }
    }
    user.families = families;
    return this.saveUserAndCached(user);
  }

  crateNewFamily(family: Family) {
    return this.familyDao.save(family);
  }

  getFamilyById(id: Family['id']) {
    return this.familyDao.findOneByOrFail({ id });
  }

  getFamilyByName(name: Family['name']) {
    return this.familyDao.findOneBy({ name });
  }

  getAssetBotUser() {
    return this.getUserByEmail(User.IntendedUsers.BotUser);
  }

  async listAssetPublicUser() {
    const botUser = await this.getAssetBotUser();
    return [botUser];
  }

  getSaltByEmail(email: User['email']) {
    return this.userDao.findOneOrFail({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        salt: true,
      },
      loadEagerRelations: false,
    });
  }

  private generateSaltedPassword(salt: string, password: string) {
    this.logger.debug(`generateSaltedPassword => ${salt}, ${password}`);
    return sha1(password, salt);
  }

  private generateDefaultPassword() {
    const defaultPassword = generateRandomString();
    // default password is salt
    const salt = defaultPassword;
    const saltedPassword = this.generateSaltedPassword(defaultPassword, defaultPassword);
    return {
      salt,
      saltedPassword,
    };
  }

  private async initUserDefaultProperty(draft: User) {
    // 默认角色
    const defaultRole = await this.roleService.getDefaultRole();
    draft.roles = [defaultRole];
    // 默认密码
    const { salt, saltedPassword } = this.generateDefaultPassword();
    draft.saltedPassword = saltedPassword;
    draft.salt = salt;
    return draft;
  }

  private async saveUserAndCached<T extends User>(user: T) {
    const updatedUser = await this.userDao.save(user);
    // update to cache
    await this.cacheService.hSetJSON(REDIS_KEYS.USERS, user.id, updatedUser);
    return updatedUser;
  }
}
