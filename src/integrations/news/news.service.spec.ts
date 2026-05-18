import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { newsConfig } from '../../config';
import { RedisService } from '../../cache/redis.service';
import { NEWS_PROVIDERS } from './providers/news-provider.interface';
import type { NewsProvider } from './providers/news-provider.interface';
import { NewsIntegrationService } from './news.service';

describe('NewsIntegrationService', () => {
  let service: NewsIntegrationService;

  const primary: NewsProvider = {
    name: 'finnhub',
    isConfigured: () => true,
    fetchCompanyNews: jest.fn().mockRejectedValue(new Error('finnhub down')),
  };

  const fallback: NewsProvider = {
    name: 'mock',
    isConfigured: () => true,
    fetchCompanyNews: jest.fn().mockResolvedValue([
      {
        id: 'mock-1',
        headline: 'Test headline',
        summary: 'Test summary',
        source: 'Mock',
        url: 'https://example.com',
        publishedAt: new Date().toISOString(),
      },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [newsConfig], isGlobal: true })],
      providers: [
        NewsIntegrationService,
        {
          provide: RedisService,
          useValue: {
            getJson: jest.fn().mockResolvedValue(null),
            setJson: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: NEWS_PROVIDERS,
          useValue: [primary, fallback],
        },
      ],
    }).compile();

    service = module.get(NewsIntegrationService);
  });

  it('falls back to mock provider', async () => {
    const feed = await service.getCompanyNews('AAPL', { limit: 5 });
    expect(feed.provider).toBe('mock');
    expect(feed.articles[0]?.headline).toBe('Test headline');
    expect(feed.symbol).toBe('AAPL');
  });
});
