import { LoggerService } from '@/common/logger/logger.service';
import { PostService } from '@/modules/post/post.service';
import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '@/common/decorator/auth-guard.decorator';
import { QueryPostsDto } from '@/modules/post/dto/query-posts.dto';
import { BodyPagination } from '@/common/decorator/pagination/pagination.decorator';

@Controller('post-manage')
@ApiTags('post-manage')
@AdminAuthGuard()
export class PostManageController {
  constructor(private readonly logger: LoggerService, private readonly postService: PostService) {
    this.logger.setContext(PostManageController.name);
  }

  @Post('query-posts')
  @ApiOperation({
    summary: '分页查询日志',
    operationId: 'queryPosts',
  })
  queryPosts(@BodyPagination() paginateQueryPostDto: QueryPostsDto) {
    return this.postService.queryPosts(paginateQueryPostDto);
  }
}
