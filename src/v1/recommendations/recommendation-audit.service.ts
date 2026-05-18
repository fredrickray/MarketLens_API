import { Injectable, Logger } from '@nestjs/common';
import type { StockAnalysisResult } from '../../core/types/analysis.types';
import type { AnalysisContext } from '../../core/types/analysis.types';
import { RecommendationsRepository } from './recommendations.repository';

export interface AuditLogInput {
  analysis: StockAnalysisResult;
  context: AnalysisContext;
  wasCached: boolean;
  marketProvider: string;
  userId?: string | null;
}

@Injectable()
export class RecommendationAuditService {
  private readonly logger = new Logger(RecommendationAuditService.name);

  constructor(private readonly repository: RecommendationsRepository) {}

  async logRecommendationServed(input: AuditLogInput): Promise<void> {
    try {
      await this.repository.create({
        symbol: input.analysis.symbol,
        userId: input.userId ?? null,
        finalAction: input.analysis.recommendation.action,
        rawAction: input.analysis.model.raw_action,
        finalConfidence: input.analysis.recommendation.confidence,
        rawConfidence: input.analysis.model.raw_confidence,
        modelVersion: input.analysis.model.version ?? null,
        mlMode: input.analysis.model.mode,
        timeHorizon: input.context.time_horizon ?? null,
        riskTolerance: input.context.risk_tolerance ?? null,
        rulesApplied: input.analysis.recommendation.rulesApplied,
        warnings: input.analysis.recommendation.warnings,
        wasCached: input.wasCached,
        marketProvider: input.marketProvider,
        isInformationalOnly: input.analysis.recommendation.isInformationalOnly,
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist recommendation audit for ${input.analysis.symbol}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
