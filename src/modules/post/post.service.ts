import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { countBy, flatten, pick, pluck, trim } from 'ramda';
import { Post } from '@/modules/post/entities/post.entity';
import type { User } from '@/modules/user/entities/user.entity';
import type { CreatePostDto } from '@/modules/post/dto/create-post.dto';
import { AssetService } from '@/modules/asset/asset.service';
import type { SearchPostDto } from '@/modules/post/dto/search-post.dto';
import { LoggerService } from '@/common/logger/logger.service';
import { isDefined } from '@powerfulyang/utils';
import type { PatchPostDto } from '@/modules/post/dto/patch-post.dto';
import { PostLog } from '@/modules/post/entities/post.log.entity';
import { BaseService } from '@/common/service/base/BaseService';

@Injectable()
export class PostService extends BaseService {
  constructor(
    @InjectRepository(Post) private readonly postDao: Repository<Post>,
    private readonly assetService: AssetService,
    private readonly logger: LoggerService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super();
    this.logger.setContext(PostService.name);
  }

  async updatePost(post: PatchPostDto) {
    // update
    const findPost = await this.postDao.findOneOrFail({
      where: {
        id: post.id,
      },
      relations: ['createBy'],
    });

    if (findPost.createBy.id !== post.updateBy.id) {
      throw new ForbiddenException('You can only update your own post!');
    }

    findPost.content = post.content;
    findPost.title = post.title;
    if (post.tags) {
      findPost.tags = post.tags;
    }
    if (post.posterId) {
      findPost.poster = await this.assetService.getAssetById(post.posterId);
    }
    if (isDefined(post.public)) {
      findPost.public = post.public;
    }
    if (post.summary) {
      findPost.summary = post.summary;
    }
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(findPost);
      await manager.save(PostLog, {
        post: saved,
        content: post.content,
        title: post.title,
      });
      super.reindexAlgoliaCrawler().catch((e) => {
        this.logger.error(e);
      });
      return saved;
    });
  }

  async createPost(post: CreatePostDto) {
    const draft = pick(
      ['title', 'content', 'summary', 'tags', 'posterId', 'public', 'createBy'],
      post,
    );
    if (!draft.posterId) {
      const poster = await this.assetService.randomPoster();
      Reflect.set(draft, 'poster', poster);
    } else {
      const poster = await this.assetService.getAssetById(draft.posterId);
      Reflect.set(draft, 'poster', poster);
    }
    const toSave = this.postDao.create(draft);
    return this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(toSave);
      await manager.save(PostLog, {
        post: saved,
        content: post.content,
        title: post.title,
      });
      super.reindexAlgoliaCrawler().catch((e) => {
        this.logger.error(e);
      });
      return saved;
    });
  }

  async deletePost(post: Pick<Post, 'id' | 'createBy'>) {
    const result = await this.postDao.delete({
      id: post.id,
      createBy: {
        id: post.createBy.id,
      },
    });
    if (result.affected === 0) {
      throw new ForbiddenException('You can only delete your own post!');
    }
    super.reindexAlgoliaCrawler().catch((e) => {
      this.logger.error(e);
    });
  }

  readPost(id: Post['id'], ids: User['id'][] = [], versions?: string[]) {
    return this.postDao.findOneOrFail({
      where: [
        {
          id: Number(id),
          public: true,
          logs: {
            id: super.ignoreEmptyArray(versions),
          },
        },
        {
          id: Number(id),
          createBy: {
            id: In(ids),
          },
          logs: {
            id: super.ignoreEmptyArray(versions),
          },
        },
      ],
      relations: ['logs'],
      order: {
        logs: {
          id: 'DESC',
        },
      },
    });
  }

  queryPosts(post?: SearchPostDto, ids: User['id'][] = []) {
    return this.postDao.find({
      select: {
        id: true,
        title: true,
        createAt: true,
        poster: {
          objectUrl: true,
          size: {
            width: true,
            height: true,
          },
        },
        summary: true,
        createBy: {
          nickname: true,
        },
      },
      order: { id: 'DESC' },
      relations: ['poster', 'createBy'],
      loadEagerRelations: false,
      where: [
        {
          ...post,
          createBy: {
            id: In(ids),
          },
        },
        { ...post, public: true },
      ],
    });
  }

  async getPublishedTags(ids: User['id'][] = []) {
    const tagsArr = await this.postDao.find({
      select: ['tags'],
      where: [
        {
          createBy: {
            id: In(ids),
          },
        },
        { public: true },
      ],
    });
    const tags = flatten(tagsArr.map((item) => item.tags));
    return countBy(trim)(tags);
  }

  async getPublishedYears(ids: User['id'][] = []) {
    const res: Array<Pick<Post, 'publishYear'>> = await this.postDao
      .createQueryBuilder()
      .select(['"publishYear"'])
      .where([
        {
          createBy: {
            id: In(ids),
          },
        },
        { public: true },
      ])
      .orderBy('"publishYear"', 'DESC')
      .distinct(true)
      .getRawMany();
    return pluck('publishYear')(res);
  }
}
