import { Module } from '@nestjs/common';
import { AnalysisModule } from './analysis/analysis.module';
import { AuthModule } from './auth/auth.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { StocksModule } from './stocks/stocks.module';

@Module({
  imports: [AuthModule, StocksModule, AnalysisModule, RecommendationsModule],
})
export class V1Module {}
