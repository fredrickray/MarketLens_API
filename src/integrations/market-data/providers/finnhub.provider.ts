import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ResourceNotFound,
  ServerError,
} from '../../../core/exceptions/http.errors';
import type {
  StockHistoricalSeries,
  StockOverview,
  StockQuote,
  StockSearchResult,
} from '../../../core/types/market.types';
import type { MarketDataProvider } from './market-data-provider.interface';

interface FinnhubSearchResponse {
  result?: Array<{
    symbol?: string;
    description?: string;
    displaySymbol?: string;
    type?: string;
  }>;
}

interface FinnhubQuoteResponse {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
}

interface FinnhubProfileResponse {
  name?: string;
  exchange?: string;
  finnhubIndustry?: string;
  marketCapitalization?: number;
  currency?: string;
}

interface FinnhubMetricResponse {
  metric?: {
    '52WeekHigh'?: number;
    '52WeekLow'?: number;
    '10DayAverageTradingVolume'?: number;
  };
}

@Injectable()
export class FinnhubProvider implements MarketDataProvider {
  readonly name = 'finnhub';

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return (this.config.get<string>('market.finnhubApiKey') ?? '').length > 0;
  }

  async searchSymbols(query: string, limit = 10): Promise<StockSearchResult[]> {
    const token = this.requireApiKey();
    const url = new URL('https://finnhub.io/api/v1/search');
    url.searchParams.set('q', query);
    url.searchParams.set('token', token);

    const response = await fetch(url);
    if (!response.ok) {
      throw new ServerError(`Finnhub search failed (${response.status})`);
    }

    const data = (await response.json()) as FinnhubSearchResponse;
    return (data.result ?? [])
      .filter((item) => item.symbol)
      .slice(0, limit)
      .map((item) => ({
        symbol: item.symbol!.toUpperCase(),
        name: item.description ?? item.displaySymbol ?? item.symbol!,
        type: item.type,
      }));
  }

  async getOverview(symbol: string): Promise<StockOverview> {
    const token = this.requireApiKey();
    const [quoteRes, profileRes, metricRes] = await Promise.all([
      fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`,
      ),
      fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`,
      ),
      fetch(
        `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${token}`,
      ),
    ]);

    if (!quoteRes.ok) {
      throw new ServerError(`Finnhub quote failed (${quoteRes.status})`);
    }

    const quoteData = (await quoteRes.json()) as FinnhubQuoteResponse;
    const profile = profileRes.ok
      ? ((await profileRes.json()) as FinnhubProfileResponse)
      : {};
    const metrics = metricRes.ok
      ? ((await metricRes.json()) as FinnhubMetricResponse).metric
      : undefined;

    const quote = this.mapQuote(symbol, quoteData, profile.currency);
    return {
      symbol,
      name: profile.name ?? symbol,
      exchange: profile.exchange,
      industry: profile.finnhubIndustry,
      marketCap: profile.marketCapitalization
        ? profile.marketCapitalization * 1_000_000
        : undefined,
      quote,
      fiftyTwoWeekHigh: metrics?.['52WeekHigh'],
      fiftyTwoWeekLow: metrics?.['52WeekLow'],
      provider: this.name,
    };
  }

  /**
   * Lightweight profile lookup used to enrich overviews served by other
   * providers (e.g. Yahoo has no market cap on its free endpoint).
   */
  async getProfileEnrichment(symbol: string): Promise<Partial<StockOverview>> {
    const token = this.requireApiKey();
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`,
    );
    if (!response.ok) {
      throw new ServerError(`Finnhub profile failed (${response.status})`);
    }

    const profile = (await response.json()) as FinnhubProfileResponse;
    return {
      name: profile.name,
      exchange: profile.exchange,
      industry: profile.finnhubIndustry,
      marketCap: profile.marketCapitalization
        ? profile.marketCapitalization * 1_000_000
        : undefined,
    };
  }

  async getHistoricalSeries(
    symbol: string,
    days = 60,
  ): Promise<StockHistoricalSeries> {
    const token = this.requireApiKey();
    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 86_400;
    const url = new URL('https://finnhub.io/api/v1/stock/candle');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('resolution', 'D');
    url.searchParams.set('from', String(from));
    url.searchParams.set('to', String(to));
    url.searchParams.set('token', token);

    const response = await fetch(url);
    if (!response.ok) {
      throw new ServerError(`Finnhub candle failed (${response.status})`);
    }

    const data = (await response.json()) as {
      s?: string;
      c?: number[];
      v?: number[];
      t?: number[];
    };

    if (data.s !== 'ok' || !data.c?.length) {
      throw new ResourceNotFound(`No historical data for ${symbol}`);
    }

    const start = Math.max(0, data.c.length - days);
    return {
      symbol: symbol.toUpperCase(),
      prices: data.c.slice(start),
      volume: (data.v ?? []).slice(start),
      timestamps: (data.t ?? [])
        .slice(start)
        .map((ts) => new Date(ts * 1000).toISOString()),
      provider: this.name,
    };
  }

  private mapQuote(
    symbol: string,
    data: FinnhubQuoteResponse,
    currency?: string,
  ): StockQuote {
    const price = data.c ?? 0;
    return {
      symbol,
      price,
      change: data.d ?? 0,
      changePercent: data.dp ?? 0,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
      currency,
      timestamp: data.t
        ? new Date(data.t * 1000).toISOString()
        : new Date().toISOString(),
    };
  }

  private requireApiKey(): string {
    const key = this.config.get<string>('market.finnhubApiKey') ?? '';
    if (!key) {
      throw new ServerError('Finnhub API key is not configured');
    }
    return key;
  }
}
