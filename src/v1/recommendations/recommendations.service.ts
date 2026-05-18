import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecommendationAction } from '../../core/enums/recommendation-action.enum';
import { TimeHorizon } from '../../core/enums/time-horizon.enum';
import type { ProductRecommendation } from '../../core/types/analysis.types';
import type {
  MlPredictContext,
  MlPredictResponse,
} from '../../core/types/ml.types';
import type { StockQuote } from '../../core/types/market.types';

export interface ApplyRulesMarketContext {
  quote?: StockQuote;
}

@Injectable()
export class RecommendationsService {
  constructor(private readonly config: ConfigService) {}

  applyRules(
    ml: MlPredictResponse,
    context?: MlPredictContext,
    market?: ApplyRulesMarketContext,
  ): ProductRecommendation {
    const rulesApplied: string[] = [];
    const warnings: string[] = [];
    let action = ml.action;
    const rawAction = ml.action;

    const minBuy = this.config.get<number>('ml.minBuyConfidence') ?? 0.6;
    const minAvoid = this.config.get<number>('ml.minAvoidConfidence') ?? 0.55;
    const volatilityThreshold =
      this.config.get<number>('compliance.volatilityWarningPercent') ?? 5;
    const informationalMax =
      this.config.get<number>('compliance.informationalConfidenceMax') ?? 0.5;

    if (action === RecommendationAction.BUY && ml.confidence < minBuy) {
      action = RecommendationAction.HOLD;
      rulesApplied.push('buy_confidence_floor');
      warnings.push(
        `Confidence ${ml.confidence} below BUY threshold (${minBuy}); downgraded to HOLD.`,
      );
    }

    if (action === RecommendationAction.AVOID && ml.confidence < minAvoid) {
      action = RecommendationAction.HOLD;
      rulesApplied.push('avoid_confidence_floor');
      warnings.push(
        `Confidence ${ml.confidence} below AVOID threshold (${minAvoid}); downgraded to HOLD.`,
      );
    }

    const changePercent = Math.abs(market?.quote?.changePercent ?? 0);
    if (changePercent >= volatilityThreshold) {
      rulesApplied.push('high_volatility_flag');
      warnings.push(
        `Elevated daily price movement (${changePercent.toFixed(2)}%) — exercise caution.`,
      );
      if (
        context?.risk_tolerance === 'low' &&
        action === RecommendationAction.BUY
      ) {
        action = RecommendationAction.HOLD;
        rulesApplied.push('low_risk_volatility_buy_block');
        warnings.push(
          'Low risk profile with high volatility — BUY downgraded to HOLD.',
        );
      }
    }

    if (
      context?.time_horizon === TimeHorizon.SHORT &&
      action === RecommendationAction.BUY
    ) {
      rulesApplied.push('short_horizon_buy_warning');
      warnings.push(
        'Short time horizon with BUY signal — consider timing and liquidity carefully.',
      );
    }

    if (
      context?.risk_tolerance === 'low' &&
      action === RecommendationAction.BUY &&
      !rulesApplied.includes('low_risk_volatility_buy_block')
    ) {
      rulesApplied.push('low_risk_buy_warning');
      warnings.push(
        'Low risk tolerance profile — verify position sizing before acting.',
      );
    }

    if (
      context?.risk_tolerance === 'high' &&
      action === RecommendationAction.AVOID
    ) {
      rulesApplied.push('high_risk_avoid_context');
      warnings.push(
        'High risk tolerance profile — AVOID may be conservative relative to your stated preferences.',
      );
    }

    if (ml.confidence < informationalMax) {
      rulesApplied.push('low_confidence_informational');
      warnings.push('Low model confidence — treat as informational only.');
    }

    const wasAdjusted = action !== rawAction;
    const isInformationalOnly =
      wasAdjusted ||
      ml.confidence < informationalMax ||
      rulesApplied.includes('low_confidence_informational');

    return {
      action,
      confidence: ml.confidence,
      explanation: ml.explanation,
      warnings,
      rulesApplied,
      isInformationalOnly,
      wasAdjusted,
    };
  }
}
