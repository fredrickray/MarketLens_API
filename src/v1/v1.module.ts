import { Module } from '@nestjs/common';
import { AnalysisModule } from './analysis/analysis.module';
import { AuthModule } from './auth/auth.module';
import { StocksModule } from './stocks/stocks.module';

@Module({
  imports: [AuthModule, StocksModule, AnalysisModule],
})
export class V1Module {}
