import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RecommendationAction } from '../../core/enums/recommendation-action.enum';
import { MlServiceMode } from '../../core/enums/ml-mode.enum';
import { ResourceNotFound } from '../../core/exceptions/http.errors';
import { complianceConfig, marketConfig, mlConfig } from '../../config';
import { RedisService } from '../../cache/redis.service';
import { MarketDataService } from '../../integrations/market-data/market-data.service';
import { MlService } from '../../integrations/ml-service/ml.service';
import { ComplianceService } from '../recommendations/compliance.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { RecommendationAuditService } from '../recommendations/recommendation-audit.service';
import { RecommendationsService } from '../recommendations/recommendations.service';
import {
  AnalysisService,
  HISTORY_UNAVAILABLE_REASON,
} from './analysis.service';

describe('AnalysisService', () => {
  let service: AnalysisService;
  let marketData: {
    getOverview: jest.Mock;
    getHistoricalSeries: jest.Mock;
  };

  beforeEach(async () => {
    marketData = {
      getOverview: jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        provider: 'mock',
        quote: {
          symbol: 'AAPL',
          price: 200,
          change: 1,
          changePercent: 0.5,
          timestamp: new Date().toISOString(),
        },
        cached: false,
      }),
      getHistoricalSeries: jest.fn().mockResolvedValue({
        symbol: 'AAPL',
        prices: [195, 198, 200],
        volume: [1e6, 1.1e6, 1.2e6],
        timestamps: [
          '2026-01-01T00:00:00.000Z',
          '2026-01-02T00:00:00.000Z',
          '2026-01-03T00:00:00.000Z',
        ],
        provider: 'mock',
        cached: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [mlConfig, marketConfig, complianceConfig],
          isGlobal: true,
        }),
      ],
      providers: [
        AnalysisService,
        RecommendationsService,
        ComplianceService,
        {
          provide: RecommendationAuditService,
          useValue: {
            logRecommendationServed: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SecurityAuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: RedisService,
          useValue: {
            getJson: jest.fn().mockResolvedValue(null),
            setJson: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MarketDataService,
          useValue: marketData,
        },
        {
          provide: MlService,
          useValue: {
            getMode: jest.fn().mockReturnValue(MlServiceMode.MOCK),
            predict: jest.fn().mockResolvedValue({
              symbol: 'AAPL',
              action: RecommendationAction.BUY,
              confidence: 0.75,
              explanation: 'Upward momentum',
              model_version: 'mock-v0',
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AnalysisService);
  });

  it('returns analysis with recommendation and compliance', async () => {
    const result = await service.analyze('AAPL', { risk_tolerance: 'medium' });

    expect(result.data.symbol).toBe('AAPL');
    expect(result.data.recommendation.action).toBe(RecommendationAction.BUY);
    expect(result.compliance.isInformationalOnly).toBeDefined();
    expect(result.compliance.rulesApplied).toBeDefined();
    expect(result.disclaimer).toBeDefined();
    expect(result.meta.mlMode).toBe(MlServiceMode.MOCK);
  });

  it('returns a friendly error when price history is unavailable', async () => {
    marketData.getOverview.mockResolvedValue({
      symbol: 'MTNN.NL',
      name: 'MTN Nigeria Communications PLC',
      exchange: 'NIGERIAN STOCK EXCHANGE',
      provider: 'finnhub',
      quote: {
        symbol: 'MTNN.NL',
        price: 826.5,
        change: 3,
        changePercent: 0.36,
        currency: 'NGN',
        timestamp: new Date().toISOString(),
      },
      cached: false,
    });
    marketData.getHistoricalSeries.mockRejectedValue(
      new ResourceNotFound('Market data unavailable'),
    );

    const error: unknown = await service
      .analyze('MTNN.NL')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ResourceNotFound);
    const notFound = error as ResourceNotFound;
    expect(notFound.message).toContain('not available for this exchange');
    expect(notFound.details).toEqual({
      reason: HISTORY_UNAVAILABLE_REASON,
      symbol: 'MTNN.NL',
      exchange: 'NIGERIAN STOCK EXCHANGE',
    });
  });
});
