import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_KEYS } from '../../core/constants/cache-keys.constant';
import { FINANCIAL_DISCLAIMER } from '../../core/constants/disclaimer.constant';
import type {
  AnalysisContext,
  CachedStockAnalysis,
  StockAnalysisResult,
} from '../../core/types/analysis.types';
import type { ComplianceEnvelope } from '../../core/types/compliance.types';
import type { MlPredictContext } from '../../core/types/ml.types';
import { RedisService } from '../../cache/redis.service';
import { MarketDataService } from '../../integrations/market-data/market-data.service';
import { MlService } from '../../integrations/ml-service/ml.service';
import { SecurityAuditEvent } from '../../core/enums/security-audit-event.enum';
import { SecurityAuditService } from '../audit/security-audit.service';
import { ComplianceService } from '../recommendations/compliance.service';
import { RecommendationAuditService } from '../recommendations/recommendation-audit.service';
import { RecommendationsService } from '../recommendations/recommendations.service';

@Injectable()
export class AnalysisService {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    private readonly marketData: MarketDataService,
    private readonly ml: MlService,
    private readonly recommendations: RecommendationsService,
    private readonly compliance: ComplianceService,
    private readonly audit: RecommendationAuditService,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  async analyze(
    symbol: string,
    context: AnalysisContext = {},
    options?: { userId?: string | null },
  ) {
    const normalized = symbol.toUpperCase();
    await this.securityAudit.log({
      event: SecurityAuditEvent.ANALYSIS_REQUEST,
      userId: options?.userId ?? null,
      metadata: {
        symbol: normalized,
        time_horizon: context.time_horizon ?? null,
        risk_tolerance: context.risk_tolerance ?? null,
      },
    });

    const contextKey = this.buildContextKey(context);
    const cacheKey = CACHE_KEYS.stockAnalysis(symbol, contextKey);

    const cached = await this.redis.getJson<CachedStockAnalysis>(cacheKey);
    if (cached) {
      const response = this.wrapResponse(cached, {
        cached: true,
        marketProvider: cached.overview.provider,
        mlMode: this.ml.getMode(),
      });
      await this.audit.logRecommendationServed({
        analysis: cached,
        context,
        wasCached: true,
        marketProvider: cached.overview.provider,
        userId: options?.userId,
      });
      return response;
    }

    const [overviewPayload, history] = await Promise.all([
      this.marketData.getOverview(symbol),
      this.marketData.getHistoricalSeries(symbol),
    ]);

    const { cached: overviewCached, ...overview } = overviewPayload;

    const mlContext: MlPredictContext = {
      time_horizon: context.time_horizon,
      risk_tolerance: context.risk_tolerance,
    };

    const mlResponse = await this.ml.predict({
      symbol: overview.symbol,
      market_data: {
        prices: history.prices,
        volume: history.volume,
        timestamps: history.timestamps,
      },
      context: mlContext,
    });

    const recommendation = this.recommendations.applyRules(
      mlResponse,
      mlContext,
      { quote: overview.quote },
    );

    const analysis: StockAnalysisResult = {
      symbol: overview.symbol,
      recommendation,
      overview,
      model: {
        version: mlResponse.model_version,
        mode: this.ml.getMode(),
        features_used: mlResponse.features_used,
        raw_action: mlResponse.action,
        raw_confidence: mlResponse.confidence,
      },
      series: {
        dataPoints: history.prices.length,
        from: history.timestamps[0],
        to: history.timestamps[history.timestamps.length - 1],
      },
    };

    const ttl = this.config.get<number>('ml.predictionCacheTtlSeconds') ?? 300;
    const cachedPayload: CachedStockAnalysis = {
      ...analysis,
      cachedAt: new Date().toISOString(),
    };
    await this.redis.setJson(cacheKey, cachedPayload, ttl);

    const response = this.wrapResponse(cachedPayload, {
      cached: false,
      marketProvider: overview.provider,
      historyProvider: history.provider,
      overviewCached,
      historyCached: history.cached,
      mlMode: this.ml.getMode(),
    });

    await this.audit.logRecommendationServed({
      analysis,
      context,
      wasCached: false,
      marketProvider: overview.provider,
      userId: options?.userId,
    });

    return response;
  }

  private wrapResponse(
    analysis: StockAnalysisResult | CachedStockAnalysis,
    meta: Record<string, unknown>,
  ): {
    data: StockAnalysisResult | CachedStockAnalysis;
    compliance: ComplianceEnvelope;
    meta: Record<string, unknown>;
    disclaimer: string;
  } {
    const compliance = this.compliance.buildEnvelope(analysis.recommendation);
    return {
      data: analysis,
      compliance,
      meta,
      disclaimer: FINANCIAL_DISCLAIMER,
    };
  }

  private buildContextKey(context: AnalysisContext): string {
    const horizon = context.time_horizon ?? 'medium';
    const risk = context.risk_tolerance ?? 'medium';
    return `${horizon}:${risk}`;
  }
}
