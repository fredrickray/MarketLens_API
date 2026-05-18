import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { marketConfig } from '../../config';
import { RedisService } from '../../cache/redis.service';
import { MARKET_DATA_PROVIDERS } from './providers/market-data-provider.interface';
import type { MarketDataProvider } from './providers/market-data-provider.interface';
import { MarketDataService } from './market-data.service';

describe('MarketDataService', () => {
  let service: MarketDataService;

  const primary: MarketDataProvider = {
    name: 'finnhub',
    isConfigured: () => true,
    searchSymbols: jest.fn().mockRejectedValue(new Error('primary down')),
    getOverview: jest.fn().mockRejectedValue(new Error('primary down')),
    getHistoricalSeries: jest.fn().mockRejectedValue(new Error('primary down')),
  };

  const fallback: MarketDataProvider = {
    name: 'mock',
    isConfigured: () => true,
    searchSymbols: jest
      .fn()
      .mockResolvedValue([{ symbol: 'AAPL', name: 'Apple Inc.' }]),
    getHistoricalSeries: jest.fn().mockResolvedValue({
      symbol: 'AAPL',
      prices: [100, 101, 102],
      volume: [1000, 1100, 1200],
      timestamps: ['2026-01-01', '2026-01-02', '2026-01-03'],
      provider: 'mock',
    }),
    getOverview: jest.fn().mockResolvedValue({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      provider: 'mock',
      quote: {
        symbol: 'AAPL',
        price: 100,
        change: 1,
        changePercent: 1,
        timestamp: new Date().toISOString(),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [marketConfig], isGlobal: true })],
      providers: [
        MarketDataService,
        {
          provide: RedisService,
          useValue: {
            getJson: jest.fn().mockResolvedValue(null),
            setJson: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: MARKET_DATA_PROVIDERS,
          useValue: [primary, fallback],
        },
      ],
    }).compile();

    service = module.get(MarketDataService);
  });

  it('falls back when primary provider fails', async () => {
    const result = await service.searchSymbols('apple', 5);
    expect(result.provider).toBe('mock');
    expect(result.results[0]?.symbol).toBe('AAPL');
  });

  it('returns overview from fallback provider', async () => {
    const overview = await service.getOverview('AAPL');
    expect(overview.symbol).toBe('AAPL');
    expect(overview.provider).toBe('mock');
  });
});
