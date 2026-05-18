import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvalidInput,
  ResourceNotFound,
} from '../../core/exceptions/http.errors';
import { CACHE_KEYS } from '../../core/constants/cache-keys.constant';
import type {
  StockHistoricalSeries,
  StockOverview,
  StockSearchResult,
} from '../../core/types/market.types';
import {
  isValidSymbol,
  normalizeSearchQuery,
  normalizeSymbol,
} from '../../core/utils/symbol.util';
import { RedisService } from '../../cache/redis.service';
import {
  MARKET_DATA_PROVIDERS,
  type MarketDataProvider,
} from './providers/market-data-provider.interface';

export type MarketProviderName = 'finnhub' | 'alpha-vantage' | 'yahoo' | 'mock';

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly providerMap: Map<string, MarketDataProvider>;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
    @Inject(MARKET_DATA_PROVIDERS)
    providers: MarketDataProvider[],
  ) {
    this.providerMap = new Map(providers.map((p) => [p.name, p]));
  }

  async searchSymbols(
    query: string,
    limit = 10,
  ): Promise<{
    results: StockSearchResult[];
    cached: boolean;
    provider: string;
  }> {
    const normalizedQuery = normalizeSearchQuery(query);
    if (normalizedQuery.length < 1) {
      throw new InvalidInput('Search query is required');
    }

    const cacheKey = CACHE_KEYS.stockSearch(normalizedQuery);
    const cached = await this.redis.getJson<StockSearchResult[]>(cacheKey);
    if (cached) {
      return {
        results: cached.slice(0, limit),
        cached: true,
        provider: 'cache',
      };
    }

    const { results, provider } = await this.executeWithFallback((p) =>
      p.searchSymbols(normalizedQuery, limit),
    );

    const ttl = this.config.get<number>('market.searchCacheTtlSeconds') ?? 300;
    await this.redis.setJson(cacheKey, results, ttl);

    return { results, cached: false, provider };
  }

  async getOverview(
    symbol: string,
  ): Promise<StockOverview & { cached: boolean }> {
    const normalized = normalizeSymbol(symbol);
    if (!isValidSymbol(normalized)) {
      throw new InvalidInput('Invalid stock symbol');
    }

    const cacheKey = CACHE_KEYS.stockOverview(normalized);
    const cached = await this.redis.getJson<StockOverview>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const { results: overview, provider } = await this.executeWithFallback(
      (p) => p.getOverview(normalized),
    );

    const enriched: StockOverview = {
      ...overview,
      symbol: normalized,
      provider,
      cachedAt: new Date().toISOString(),
    };

    const ttl = this.config.get<number>('market.overviewCacheTtlSeconds') ?? 60;
    await this.redis.setJson(cacheKey, enriched, ttl);

    return { ...enriched, cached: false };
  }

  async getHistoricalSeries(
    symbol: string,
    days?: number,
  ): Promise<StockHistoricalSeries & { cached: boolean }> {
    const normalized = normalizeSymbol(symbol);
    if (!isValidSymbol(normalized)) {
      throw new InvalidInput('Invalid stock symbol');
    }

    const historyDays =
      days ?? this.config.get<number>('market.historyDays') ?? 60;
    const cacheKey = CACHE_KEYS.stockHistory(normalized, historyDays);
    const cached = await this.redis.getJson<StockHistoricalSeries>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const { results: series, provider } = await this.executeWithFallback((p) =>
      p.getHistoricalSeries(normalized, historyDays),
    );

    const enriched: StockHistoricalSeries = {
      ...series,
      symbol: normalized,
      provider,
    };

    const ttl =
      this.config.get<number>('market.historyCacheTtlSeconds') ?? 3600;
    await this.redis.setJson(cacheKey, enriched, ttl);

    return { ...enriched, cached: false };
  }

  async warmSymbol(symbol: string): Promise<void> {
    try {
      await this.getOverview(symbol);
    } catch (error) {
      this.logger.warn(
        `Warm cache failed for ${symbol}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  getActiveProviderNames(): string[] {
    return this.getProviderChain().map((p) => p.name);
  }

  private async executeWithFallback<T>(
    fn: (provider: MarketDataProvider) => Promise<T>,
  ): Promise<{ results: T; provider: string }> {
    const chain = this.getProviderChain();
    if (chain.length === 0) {
      throw new ResourceNotFound('No market data providers available');
    }

    const errors: string[] = [];

    for (const provider of chain) {
      try {
        const results = await fn(provider);
        return { results, provider: provider.name };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown provider error';
        errors.push(`${provider.name}: ${message}`);
        this.logger.warn(
          `Provider ${provider.name} failed, trying next fallback`,
        );
      }
    }

    throw new ResourceNotFound(`Market data unavailable. ${errors.join('; ')}`);
  }

  private getProviderChain(): MarketDataProvider[] {
    const defaultName =
      this.config.get<string>('market.defaultProvider') ?? 'finnhub';
    const fallbackOrder: MarketProviderName[] = [
      defaultName as MarketProviderName,
      'finnhub',
      'alpha-vantage',
      'yahoo',
      'mock',
    ];

    const seen = new Set<string>();
    const chain: MarketDataProvider[] = [];

    for (const name of fallbackOrder) {
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
