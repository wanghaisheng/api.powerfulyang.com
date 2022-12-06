import { Controller, Get, Param, Query } from '@nestjs/common';
import { LoggerService } from '@/common/logger/logger.service';
import { AssetService } from '@/modules/asset/asset.service';
import { PostService } from '@/modules/post/post.service';
import { FeedService } from '@/modules/feed/feed.service';
import { PublicAuthGuard } from '@/common/decorator/auth-guard';
import { FamilyMembersIdFromAuth, UserFromAuth } from '@/common/decorator/user-from-auth.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { SearchPostDto } from '@/modules/post/dto/search-post.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('public')
@PublicAuthGuard()
@ApiTags('public-api')
export class PublicController {
  constructor(
    private readonly logger: LoggerService,
    private readonly assetService: AssetService,
    private readonly postService: PostService,
    private readonly feedService: FeedService,
  ) {
    this.logger.setContext(PublicController.name);
  }

  @Get('hello')
  @ApiOperation({
    summary: 'hello ping',
    operationId: 'hello',
  })
  hello(@UserFromAuth() user: User): string {
    return `Hello, ${user.nickname || 'unauthorized visitor'}!`;
  }

  @Get('post')
  @ApiOperation({
    summary: '获取所有的公开文章列表',
    operationId: 'queryPublicPosts',
  })
  queryPublicPosts(@FamilyMembersIdFromAuth() userIds: User['id'][], @Query() post: SearchPostDto) {
    return this.postService.queryPosts(post, userIds);
  }

  @Get('post/years')
  @ApiOperation({
    summary: '获取所有的公开文章的年份列表',
    operationId: 'queryPublicPostYears',
  })
  queryPublicPostYears(@FamilyMembersIdFromAuth() userIds: User['id'][]) {
    return this.postService.getPublishedYears(userIds);
  }

  @Get('post/tags')
  @ApiOperation({
    summary: '获取所有的公开文章的标签列表',
    operationId: 'queryPublicPostTags',
  })
  queryPublicPostTags(@FamilyMembersIdFromAuth() userIds: User['id'][]) {
    return this.postService.getPublishedTags(userIds);
  }

  @Get('post/:id')
  @ApiOperation({
    summary: '获取单个文章详细信息',
    operationId: 'getPublicPostById',
  })
  getPublicPostById(
    @Param('id') idOrTitle: string,
    @FamilyMembersIdFromAuth() userIds: User['id'][],
  ) {
    return this.postService.readPost(idOrTitle, userIds);
  }

  @Get('feed')
  @ApiOperation({
    summary: '获取所有的公开时间线',
    operationId: 'queryPublicTimeline',
  })
  queryPublicTimeline(
    @Query('prevCursor') prevCursor: string,
    @Query('nextCursor') nextCursor: string,
    @Query('take') take: string,
    @FamilyMembersIdFromAuth() userIds: User['id'][],
  ) {
    return this.feedService.infiniteQuery({
      prevCursor,
      nextCursor,
      userIds,
      take,
    });
  }

  @Get('asset')
  @ApiOperation({
    summary: '获取公开的图片资源',
    operationId: 'infiniteQueryPublicAsset',
  })
  infiniteQueryPublicAsset(
    @Query('prevCursor') prevCursor: string,
    @Query('nextCursor') nextCursor: string,
    @Query('take') take: string,
    @FamilyMembersIdFromAuth() userIds: User['id'][],
  ) {
    return this.assetService.infiniteQuery({
      prevCursor,
      nextCursor,
      userIds,
      take,
    });
  }

  @Get('asset/:id')
  @ApiOperation({
    summary: '获取单个公开的图片资源',
    operationId: 'getPublicAssetById',
  })
  getPublicAssetById(@Param('id') id: string, @FamilyMembersIdFromAuth() userIds: User['id'][]) {
    return this.assetService.getAccessAssetById(+id, userIds);
  }
}
