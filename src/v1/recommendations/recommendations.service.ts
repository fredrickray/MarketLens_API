import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecommendationAction } from '../../core/enums/recommendation-action.enum';
import type { ProductRecommendation } from '../../core/types/analysis.types';
import type { MlPredictContext } from '../../core/types/ml.types';
import type { MlPredictResponse } from '../../core/types/ml.types';

@Injectable()
export class RecommendationsService {
  constructor(private readonly config: ConfigService) {}

  applyRules(
    ml: MlPredictResponse,
    context?: MlPredictContext,
  ): ProductRecommendation {
    const warnings: string[] = [];
    let action = ml.action;

    const minBuy = this.config.get<number>('ml.minBuyConfidence') ?? 0.6;
    const minAvoid = this.config.get<number>('ml.minAvoidConfidence') ?? 0.55;

    if (action === RecommendationAction.BUY && ml.confidence < minBuy) {
      action = RecommendationAction.HOLD;
      warnings.push(
        `Confidence ${ml.confidence} below BUY threshold (${minBuy}); downgraded to HOLD.`,
      );
    }

    if (action === RecommendationAction.AVOID && ml.confidence < minAvoid) {
      action = RecommendationAction.HOLD;
      warnings.push(
        `Confidence ${ml.confidence} below AVOID threshold (${minAvoid}); downgraded to HOLD.`,
      );
    }

    if (ml.confidence < 0.5) {
      warnings.push('Low model confidence — treat as informational only.');
    }

    if (
      context?.risk_tolerance === 'low' &&
      action === RecommendationAction.BUY
    ) {
      warnings.push(
        'Low risk tolerance profile — verify position sizing before acting.',
      );
    }

    return {
      action,
      confidence: ml.confidence,
      explanation: ml.explanation,
      warnings,
    };
  }
}
