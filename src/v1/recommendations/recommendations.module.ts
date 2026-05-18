import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ComplianceService } from './compliance.service';
import { RecommendationAuditService } from './recommendation-audit.service';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsRepository } from './recommendations.repository';
import { RecommendationsService } from './recommendations.service';
import {
  RecommendationAudit,
  RecommendationAuditSchema,
} from './schemas/recommendation-audit.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RecommendationAudit.name, schema: RecommendationAuditSchema },
    ]),
  ],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    ComplianceService,
    RecommendationsRepository,
    RecommendationAuditService,
  ],
  exports: [
    RecommendationsService,
    ComplianceService,
    RecommendationAuditService,
  ],
})
export class RecommendationsModule {}
