import type { RecommendationAction } from '../enums/recommendation-action.enum';
import type { TimeHorizon } from '../enums/time-horizon.enum';

export interface MlMarketDataPayload {
  prices: number[];
  volume: number[];
  timestamps?: string[];
}

export interface MlPredictContext {
  time_horizon?: TimeHorizon;
  risk_tolerance?: 'low' | 'medium' | 'high';
}

export interface MlPredictRequest {
  symbol: string;
  market_data: MlMarketDataPayload;
  context?: MlPredictContext;
}

export interface MlPredictResponse {
  symbol: string;
  action: RecommendationAction;
  confidence: number;
  explanation: string;
  model_version?: string;
  features_used?: string[];
}
