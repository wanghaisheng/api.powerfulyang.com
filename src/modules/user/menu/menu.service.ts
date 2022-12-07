import { Injectable } from '@nestjs/common';
import type { TreeRepository } from 'typeorm';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Menu } from '@/modules/user/entities/menu.entity';
import { LoggerService } from '@/common/logger/logger.service';

@Injectable()
export class MenuService {
  private readonly menuDao: TreeRepository<Menu>;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private logger: LoggerService,
  ) {
    this.logger.setContext(MenuService.name);
    this.menuDao = this.dataSource.getTreeRepository(Menu);
  }

  menus() {
    return this.menuDao.findTrees();
  }

  async initBuiltinMenus() {
    const menu = await this.menuDao.findOneBy({
      name: '用户管理',
    });
    if (!menu) {
      const UserManage = {
        id: 1,
        name: '用户管理',
        path: '/user',
      };
      await this.menuDao.save(UserManage);
      const UserList = {
        id: 2,
        name: '用户列表',
        path: '/user/list',
        parent: UserManage,
      };
      await this.menuDao.save(UserList);
    }
  }
}
