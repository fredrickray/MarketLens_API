import { Module } from '@nestjs/common';
import { MarketDataModule } from '../../integrations/market-data/market-data.module';
import { MlModule } from '../../integrations/ml-service/ml.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [MarketDataModule, MlModule, RecommendationsModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
