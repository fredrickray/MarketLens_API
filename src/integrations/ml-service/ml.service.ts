import { Injectable } from '@nestjs/common';
import { RecommendationAction } from '../../core/enums/recommendation-action.enum';
import { MlServiceMode } from '../../core/enums/ml-mode.enum';
import type {
  MlPredictRequest,
  MlPredictResponse,
} from '../../core/types/ml.types';
import { MlClient } from './ml.client';

@Injectable()
export class MlService {
  constructor(private readonly client: MlClient) {}

  getMode(): MlServiceMode {
    return this.client.isMockMode() ? MlServiceMode.MOCK : MlServiceMode.LIVE;
  }

  async predict(request: MlPredictRequest): Promise<MlPredictResponse> {
    if (this.client.isMockMode()) {
      return this.mockPredict(request);
    }
    return this.client.predict(request);
  }

  private mockPredict(request: MlPredictRequest): MlPredictResponse {
    const prices = request.market_data.prices;
    const latest = prices[prices.length - 1] ?? 0;
    const previous = prices[prices.length - 2] ?? latest;
    const delta = latest - previous;
    const pct = previous === 0 ? 0 : (delta / previous) * 100;

    let action = RecommendationAction.HOLD;
    if (pct > 1.5) {
      action = RecommendationAction.BUY;
    } else if (pct < -1.5) {
      action = RecommendationAction.AVOID;
    }

    const confidence = Math.min(0.85, Math.max(0.45, Math.abs(pct) / 10 + 0.5));

    return {
      symbol: request.symbol.toUpperCase(),
      action,
      confidence: Number(confidence.toFixed(2)),
      explanation: `Mock analysis for ${request.symbol.toUpperCase()}: recent price moved ${pct.toFixed(2)}% vs prior close. Replace with live ML when FastAPI is available.`,
      model_version: 'mock-v0',
      features_used: ['price_delta_pct'],
    };
  }
}
