import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketDataModule } from '../integrations/market-data/market-data.module';
import { NewsIntegrationModule } from '../integrations/news/news.module';
import { CacheRefreshJob } from './cache-refresh.job';
import { NewsSyncJob } from './news-sync.job';
import { StockSyncJob } from './stock-sync.job';

@Module({
  imports: [ScheduleModule.forRoot(), MarketDataModule, NewsIntegrationModule],
  providers: [StockSyncJob, CacheRefreshJob, NewsSyncJob],
})
export class JobsModule {}
