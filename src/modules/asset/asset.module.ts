import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PixivBotModule } from 'api/pixiv-bot';
import { InstagramBotModule } from 'api/instagram-bot';
import { PinterestBotModule } from 'api/pinterest-bot';
import { ProxyFetchModule } from 'api/proxy-fetch';
import { Asset } from '@/modules/asset/entities/asset.entity';
import { BucketModule } from '@/modules/bucket/bucket.module';
import { TencentCloudAccountModule } from '@/modules/tencent-cloud-account/tencent-cloud-account.module';
import { UserModule } from '@/modules/user/user.module';
import { OrmModule } from '@/common/service/orm/orm.module';
import { LoggerModule } from '@/common/logger/logger.module';
import { CoreModule } from '@/core/core.module';
import { MqModule } from '@/common/service/mq/mq.module';
import { AlgoliaService } from '@/common/service/algolia/AlgoliaService';
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
