import type { Provider } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@/common/logger/logger.module';
import { TMT_ACCOUNT } from '@/constants/PROVIDER_TOKEN';
import { TencentCloudAccountService } from '@/modules/tencent-cloud-account/tencent-cloud-account.service';
import { TencentCloudAccountModule } from '@/modules/tencent-cloud-account/tencent-cloud-account.module';
import { WordBookService } from './word-book.service';

const TencentCloudAccountProvider: Provider = {
  provide: TMT_ACCOUNT,
  inject: [TencentCloudAccountService],
  useFactory: async (tencentCloudAccountService: TencentCloudAccountService) => {
    return tencentCloudAccountService.getTMTAccount();
  },
};

@Module({
  imports: [LoggerModule, TencentCloudAccountModule],
  providers: [WordBookService, TencentCloudAccountProvider],
  exports: [WordBookService],
})
export class WordBookModule {}
