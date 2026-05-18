import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvalidInput,
  ResourceNotFound,
} from '../../core/exceptions/http.errors';
import { CACHE_KEYS } from '../../core/constants/cache-keys.constant';
import type { StockNewsFeed } from '../../core/types/news.types';
import { isValidSymbol, normalizeSymbol } from '../../core/utils/symbol.util';
import { RedisService } from '../../cache/redis.service';
import {
  NEWS_PROVIDERS,
  type NewsFetchOptions,
  type NewsProvider,
} from './providers/news-provider.interface';

export type NewsProviderName = 'finnhub' | 'mock';

@Injectable()
export class NewsIntegrationService {
  private readonly logger = new Logger(NewsIntegrationService.name);
  private readonly providerMap: Map<string, NewsProvider>;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    @Inject(NEWS_PROVIDERS) providers: NewsProvider[],
  ) {
    this.providerMap = new Map(providers.map((p) => [p.name, p]));
  }

  async getCompanyNews(
    symbol: string,
    options: NewsFetchOptions = {},
  ): Promise<StockNewsFeed & { cached: boolean }> {
    const normalized = normalizeSymbol(symbol);
    if (!isValidSymbol(normalized)) {
      throw new InvalidInput('Invalid stock symbol');
    }

    const days =
      options.days ?? this.config.get<number>('news.defaultDays') ?? 7;
    const maxLimit = this.config.get<number>('news.maxLimit') ?? 50;
    const limit = Math.min(
      options.limit ?? this.config.get<number>('news.defaultLimit') ?? 20,
      maxLimit,
    );

    const cacheKey = CACHE_KEYS.stockNews(normalized, days);
    const cached = await this.redis.getJson<StockNewsFeed>(cacheKey);
    if (cached) {
      return {
        ...cached,
        articles: cached.articles.slice(0, limit),
        cached: true,
      };
    }

    const { articles, provider } = await this.executeWithFallback((p) =>
      p.fetchCompanyNews(normalized, { days, limit }),
    );

    const feed: StockNewsFeed = {
      symbol: normalized,
      articles,
      provider,
      fetchedAt: new Date().toISOString(),
    };

    const ttl = this.config.get<number>('news.cacheTtlSeconds') ?? 600;
    await this.redis.setJson(cacheKey, feed, ttl);

    return { ...feed, cached: false };
  }

  async warmSymbol(symbol: string, days?: number): Promise<void> {
    try {
      await this.getCompanyNews(symbol, { days });
    } catch (error) {
      this.logger.warn(
        `News warm cache failed for ${symbol}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private async executeWithFallback(
    fn: (provider: NewsProvider) => Promise<StockNewsFeed['articles']>,
  ): Promise<{ articles: StockNewsFeed['articles']; provider: string }> {
    const chain = this.getProviderChain();
    if (chain.length === 0) {
      throw new ResourceNotFound('No news providers available');
    }

    const errors: string[] = [];

    for (const provider of chain) {
      try {
        const articles = await fn(provider);
        return { articles, provider: provider.name };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown provider error';
        errors.push(`${provider.name}: ${message}`);
        this.logger.warn(
          `News provider ${provider.name} failed, trying next fallback`,
        );
      }
    }

    throw new ResourceNotFound(`News unavailable. ${errors.join('; ')}`);
  }

  private getProviderChain(): NewsProvider[] {
    const defaultName =
      this.config.get<string>('news.defaultProvider') ?? 'finnhub';
    const order: NewsProviderName[] = [
      defaultName as NewsProviderName,
      'finnhub',
      'mock',
    ];

    const seen = new Set<string>();
    const chain: NewsProvider[] = [];

    for (const name of order) {
      if (seen.has(name)) {
        continue;
      }
      const provider = this.providerMap.get(name);
      if (!provider?.isConfigured()) {
        continue;
      }
      seen.add(name);
      chain.push(provider);
    }

    if (chain.length === 0) {
      const mock = this.providerMap.get('mock');
      if (mock) {
        chain.push(mock);
      }
    }

    return chain;
  }
}
