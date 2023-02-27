import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { LoggerService } from '@/common/logger/logger.service';
import { AssetService } from '@/modules/asset/asset.service';
import { PostService } from '@/modules/post/post.service';
import { FeedService } from '@/modules/feed/feed.service';
import { JwtAuthGuard, PublicAuthGuard } from '@/common/decorator/auth-guard.decorator';
import { AuthFamilyMembersId, AuthUser } from '@/common/decorator/user-from-auth.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { SearchPostDto } from '@/modules/post/dto/search-post.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatGptService } from '@app/chat-gpt';
import { PathViewCountService } from '@/modules/path-view-count/path-view-count.service';
import { ClientTimezone } from '@/common/decorator/client-timezone';

@Controller('public')
@PublicAuthGuard()
@ApiTags('public-api')
export class PublicController {
  constructor(
    private readonly logger: LoggerService,
    private readonly assetService: AssetService,
    private readonly postService: PostService,
    private readonly feedService: FeedService,
    private readonly chatGptService: ChatGptService,
    private readonly pathViewCountService: PathViewCountService,
  ) {
    this.logger.setContext(PublicController.name);
  }

  @Get('hello')
  @ApiOperation({
    summary: 'hello ping',
    operationId: 'hello',
  })
  hello(@AuthUser() user: User): string {
    return `Hello, ${user.nickname || 'unauthorized visitor'}!`;
  }

  @Get('post')
  @ApiOperation({
    summary: '获取所有的公开文章列表',
    operationId: 'queryPublicPosts',
  })
  queryPublicPosts(@AuthFamilyMembersId() userIds: User['id'][], @Query() post: SearchPostDto) {
    return this.postService.queryPosts(post, userIds);
  }

  @Get('post/years')
  @ApiOperation({
    summary: '获取所有的公开文章的年份列表',
    operationId: 'queryPublicPostYears',
  })
  queryPublicPostYears(@AuthFamilyMembersId() userIds: User['id'][]) {
    return this.postService.getPublishedYears(userIds);
  }

  @Get('post/tags')
  @ApiOperation({
    summary: '获取所有的公开文章的标签列表',
    operationId: 'queryPublicPostTags',
  })
  queryPublicPostTags(@AuthFamilyMembersId() userIds: User['id'][]) {
    return this.postService.getPublishedTags(userIds);
  }

  @Get('post/:id')
  @ApiOperation({
    summary: '获取单个文章详细信息',
    operationId: 'getPublicPostById',
  })
  getPublicPostById(
    @Param('id') id: number,
    @AuthFamilyMembersId() userIds: User['id'][],
    @Query('versions') versions: string[],
  ) {
    return this.postService.readPost(id, userIds, versions);
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
    @AuthFamilyMembersId() userIds: User['id'][],
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
    @AuthFamilyMembersId() userIds: User['id'][],
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
  getPublicAssetById(@Param('id') id: string, @AuthFamilyMembersId() userIds: User['id'][]) {
    return this.assetService.getAccessAssetById(+id, userIds);
  }

  @Post('/chat-gpt/chat')
  @JwtAuthGuard()
  chatWithChatGPT(
    @Body() body: { message: string; parentMessageId?: string; conversationId?: string },
  ) {
    return this.chatGptService.sendMessage(body.message, {
      parentMessageId: body.parentMessageId,
      conversationId: body.conversationId,
    });
  }

  @Post('/bing-ai/chat')
  @JwtAuthGuard()
  chatWithBingAI(
    @Body()
    body: {
      message: string;
      conversationSignature?: string;
      conversationId?: string;
      clientId?: string;
      invocationId?: string;
    },
  ) {
    return this.chatGptService.sendMessageWithBingAI(body.message, {
      conversationSignature: body.conversationSignature,
      conversationId: body.conversationId,
      clientId: body.clientId,
      invocationId: body.invocationId,
    });
  }

  @Get('view-count')
  viewCount(@ClientTimezone() timezone: string) {
    return this.pathViewCountService.viewCount(timezone);
  }
}
