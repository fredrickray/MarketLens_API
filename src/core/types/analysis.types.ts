import type { RecommendationAction } from '../enums/recommendation-action.enum';
import type { TimeHorizon } from '../enums/time-horizon.enum';
import type { MlServiceMode } from '../enums/ml-mode.enum';
import type { StockOverview } from './market.types';

export interface AnalysisContext {
  time_horizon?: TimeHorizon;
  risk_tolerance?: 'low' | 'medium' | 'high';
}

export interface ProductRecommendation {
  action: RecommendationAction;
  confidence: number;
  explanation: string;
  warnings: string[];
  rulesApplied: string[];
  isInformationalOnly: boolean;
  wasAdjusted: boolean;
}

export interface StockAnalysisResult {
  symbol: string;
  recommendation: ProductRecommendation;
  overview: StockOverview;
  model: {
    version?: string;
    mode: MlServiceMode;
    features_used?: string[];
    raw_action: RecommendationAction;
    raw_confidence: number;
  };
  series: {
    dataPoints: number;
    from?: string;
    to?: string;
  };
}

export interface CachedStockAnalysis extends StockAnalysisResult {
  cachedAt: string;
}
