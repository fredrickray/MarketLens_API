import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RecommendationAction } from '../../core/enums/recommendation-action.enum';
import { mlConfig } from '../../config';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [mlConfig], isGlobal: true })],
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
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('keeps high-confidence BUY', () => {
    const result = service.applyRules({
      symbol: 'AAPL',
      action: RecommendationAction.BUY,
      confidence: 0.8,
      explanation: 'test',
    });

    expect(result.action).toBe(RecommendationAction.BUY);
  });
});
