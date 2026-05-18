import { Module } from '@nestjs/common';
import { AnalysisModule } from './analysis/analysis.module';
import { AuthModule } from './auth/auth.module';
import { AlertsModule } from './alerts/alerts.module';
import { GuestModule } from './guest/guest.module';
import { NewsModule } from './news/news.module';
import { WatchlistModule } from './watchlist/watchlist.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { StocksModule } from './stocks/stocks.module';

@Module({
  imports: [
    AuthModule,
    StocksModule,
    AnalysisModule,
    RecommendationsModule,
    NewsModule,
    AlertsModule,
    GuestModule,
    WatchlistModule,
  ],
})
export class V1Module {}
