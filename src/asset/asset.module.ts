import { LoggerModule } from '@/common/logger/logger.module';
import { AlgoliaService } from '@/common/service/algolia/AlgoliaService';
import { MqModule } from '@/common/service/mq/mq.module';
import { OrmModule } from '@/common/service/orm/orm.module';
import { CoreModule } from '@/core/core.module';
import { Asset } from '@/asset/entities/asset.entity';
import { BucketModule } from '@/bucket/bucket.module';
import { InstagramBotModule } from '@/libs/instagram-bot';
import { PinterestBotModule } from '@/libs/pinterest-bot';
import { PixivBotModule } from '@/libs/pixiv-bot';
import { TencentCloudAccountModule } from '@/tencent-cloud-account/tencent-cloud-account.module';
import { UserModule } from '@/user/user.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProxyFetchModule } from '@/libs/proxy-fetch';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';

@Module({
  imports: [
    OrmModule,
    LoggerModule,
    TypeOrmModule.forFeature([Asset]),
    CoreModule,
    PixivBotModule,
    InstagramBotModule,
    PinterestBotModule,
    TencentCloudAccountModule,
    UserModule,
    BucketModule,
    MqModule,
    ProxyFetchModule.forRoot(),
  ],
  providers: [AssetService, AlgoliaService],
  controllers: [AssetController],
  exports: [AssetService],
})
export class AssetModule {}
