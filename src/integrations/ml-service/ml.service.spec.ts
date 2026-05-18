import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RecommendationAction } from '../../core/enums/recommendation-action.enum';
import { MlServiceMode } from '../../core/enums/ml-mode.enum';
import { mlConfig } from '../../config';
import { MlClient } from './ml.client';
import { MlService } from './ml.service';

describe('MlService', () => {
  let service: MlService;

  beforeEach(async () => {
    process.env.ML_SERVICE_MOCK = 'true';
    process.env.ML_SERVICE_URL = '';

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [mlConfig], isGlobal: true })],
      providers: [MlClient, MlService],
    }).compile();

    service = module.get(MlService);
  });

  it('runs in mock mode by default', () => {
    expect(service.getMode()).toBe(MlServiceMode.MOCK);
  });

  it('returns a mock prediction', async () => {
    const result = await service.predict({
      symbol: 'AAPL',
      market_data: {
        prices: [100, 102, 105],
        volume: [1_000_000, 1_100_000, 1_200_000],
      },
    });

    expect(result.symbol).toBe('AAPL');
    expect(Object.values(RecommendationAction)).toContain(result.action);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.explanation).toContain('Mock analysis');
  });
});
