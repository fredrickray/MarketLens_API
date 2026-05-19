import { Module } from '@nestjs/common';
import { MarketDataModule } from '../../integrations/market-data/market-data.module';
import { MlModule } from '../../integrations/ml-service/ml.module';
import { AuditModule } from '../audit/audit.module';
import { GuestModule } from '../guest/guest.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [
    MarketDataModule,
    MlModule,
    RecommendationsModule,
    GuestModule,
    AuditModule,
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
