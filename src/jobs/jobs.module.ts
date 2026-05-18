import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketDataModule } from '../integrations/market-data/market-data.module';
import { CacheRefreshJob } from './cache-refresh.job';
import { StockSyncJob } from './stock-sync.job';

@Module({
  imports: [ScheduleModule.forRoot(), MarketDataModule],
  providers: [StockSyncJob, CacheRefreshJob],
})
export class JobsModule {}
