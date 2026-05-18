import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RecommendationAction } from '../../core/enums/recommendation-action.enum';
import { TimeHorizon } from '../../core/enums/time-horizon.enum';
import { complianceConfig, mlConfig } from '../../config';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [mlConfig, complianceConfig],
          isGlobal: true,
        }),
      ],
      providers: [RecommendationsService],
    }).compile();

    service = module.get(RecommendationsService);
  });

  it('downgrades low-confidence BUY to HOLD', () => {
    const result = service.applyRules({
      symbol: 'AAPL',
      action: RecommendationAction.BUY,
      confidence: 0.4,
      explanation: 'test',
    });

    expect(result.action).toBe(RecommendationAction.HOLD);
    expect(result.wasAdjusted).toBe(true);
    expect(result.rulesApplied).toContain('buy_confidence_floor');
    expect(result.isInformationalOnly).toBe(true);
  });

  it('keeps high-confidence BUY', () => {
    const result = service.applyRules({
      symbol: 'AAPL',
      action: RecommendationAction.BUY,
      confidence: 0.8,
      explanation: 'test',
    });

    expect(result.action).toBe(RecommendationAction.BUY);
    expect(result.wasAdjusted).toBe(false);
  });

  it('blocks BUY for low risk under high volatility', () => {
    const result = service.applyRules(
      {
        symbol: 'AAPL',
        action: RecommendationAction.BUY,
        confidence: 0.8,
        explanation: 'test',
      },
      { risk_tolerance: 'low' },
      {
        quote: {
          symbol: 'AAPL',
          price: 100,
          change: 6,
          changePercent: 6,
          timestamp: '',
        },
      },
    );

    expect(result.action).toBe(RecommendationAction.HOLD);
    expect(result.rulesApplied).toContain('low_risk_volatility_buy_block');
  });

  it('flags short horizon BUY', () => {
    const result = service.applyRules(
      {
        symbol: 'AAPL',
        action: RecommendationAction.BUY,
        confidence: 0.8,
        explanation: 'test',
      },
      { time_horizon: TimeHorizon.SHORT },
    );

    expect(result.rulesApplied).toContain('short_horizon_buy_warning');
  });
});
