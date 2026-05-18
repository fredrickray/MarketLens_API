import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ResourceNotFound,
  ServerError,
  TooManyRequests,
} from '../../../core/exceptions/http.errors';
import type {
  StockHistoricalSeries,
  StockOverview,
  StockQuote,
  StockSearchResult,
} from '../../../core/types/market.types';
import type { MarketDataProvider } from './market-data-provider.interface';

interface AvSearchResponse {
  bestMatches?: Array<{
    '1. symbol'?: string;
    '2. name'?: string;
    '4. region'?: string;
    '3. type'?: string;
  }>;
  Note?: string;
  Information?: string;
}

interface AvGlobalQuoteResponse {
  'Global Quote'?: {
    '01. symbol'?: string;
    '05. price'?: string;
    '09. change'?: string;
    '10. change percent'?: string;
    '06. volume'?: string;
    '03. high'?: string;
    '04. low'?: string;
    '02. open'?: string;
    '08. previous close'?: string;
    '07. latest trading day'?: string;
  };
  Note?: string;
  Information?: string;
}

interface AvOverviewResponse {
  Symbol?: string;
  Name?: string;
  Exchange?: string;
  Sector?: string;
  Industry?: string;
  Description?: string;
  MarketCapitalization?: string;
  '52WeekHigh'?: string;
  '52WeekLow'?: string;
  Currency?: string;
  Note?: string;
  Information?: string;
}

@Injectable()
export class AlphaVantageProvider implements MarketDataProvider {
  readonly name = 'alpha-vantage';

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return (
      (this.config.get<string>('market.alphaVantageApiKey') ?? '').length > 0
    );
  }

  async searchSymbols(query: string, limit = 10): Promise<StockSearchResult[]> {
    const data = await this.fetch<AvSearchResponse>({
      function: 'SYMBOL_SEARCH',
      keywords: query,
    });
    this.assertNoRateLimit(data);

    return (data.bestMatches ?? [])
      .filter((m) => m['1. symbol'])
      .slice(0, limit)
      .map((m) => ({
        symbol: m['1. symbol']!.toUpperCase(),
        name: m['2. name'] ?? m['1. symbol']!,
        exchange: m['4. region'],
        type: m['3. type'],
      }));
  }

  async getOverview(symbol: string): Promise<StockOverview> {
    const [quoteData, overviewData] = await Promise.all([
      this.fetch<AvGlobalQuoteResponse>({
        function: 'GLOBAL_QUOTE',
        symbol,
      }),
      this.fetch<AvOverviewResponse>({
        function: 'OVERVIEW',
        symbol,
      }),
    ]);

    this.assertNoRateLimit(quoteData);
    this.assertNoRateLimit(overviewData);

    const gq = quoteData['Global Quote'];
    if (!gq?.['05. price']) {
      throw new ResourceNotFound(`No quote data for ${symbol}`);
    }

    const quote = this.mapQuote(symbol, gq, overviewData.Currency);
    return {
      symbol,
      name: overviewData.Name ?? symbol,
      exchange: overviewData.Exchange,
      sector: overviewData.Sector,
      industry: overviewData.Industry,
      description: overviewData.Description,
      marketCap: overviewData.MarketCapitalization
        ? Number.parseFloat(overviewData.MarketCapitalization)
        : undefined,
      fiftyTwoWeekHigh: overviewData['52WeekHigh']
        ? Number.parseFloat(overviewData['52WeekHigh'])
        : undefined,
      fiftyTwoWeekLow: overviewData['52WeekLow']
        ? Number.parseFloat(overviewData['52WeekLow'])
        : undefined,
      quote,
      provider: this.name,
    };
  }

  async getHistoricalSeries(
    symbol: string,
    days = 60,
  ): Promise<StockHistoricalSeries> {
    const data = await this.fetch<{
      'Time Series (Daily)'?: Record<
        string,
        { '4. close'?: string; '5. volume'?: string }
      >;
      Note?: string;
      Information?: string;
    }>({
      function: 'TIME_SERIES_DAILY',
      symbol,
      outputsize: 'compact',
    });

    this.assertNoRateLimit(data);
    const series = data['Time Series (Daily)'];
    if (!series) {
      throw new ResourceNotFound(`No historical data for ${symbol}`);
    }

    const entries = Object.entries(series)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-days);

    return {
      symbol: symbol.toUpperCase(),
      prices: entries.map(([, v]) => Number.parseFloat(v['4. close'] ?? '0')),
      volume: entries.map(([, v]) =>
        Number.parseInt(v['5. volume'] ?? '0', 10),
      ),
      timestamps: entries.map(([date]) => new Date(date).toISOString()),
      provider: this.name,
    };
  }

  private mapQuote(
    symbol: string,
    gq: NonNullable<AvGlobalQuoteResponse['Global Quote']>,
    currency?: string,
  ): StockQuote {
    const changePercentRaw = gq['10. change percent'] ?? '0%';
    const changePercent = Number.parseFloat(changePercentRaw.replace('%', ''));

    return {
      symbol,
      price: Number.parseFloat(gq['05. price'] ?? '0'),
      change: Number.parseFloat(gq['09. change'] ?? '0'),
      changePercent: Number.isNaN(changePercent) ? 0 : changePercent,
      volume: gq['06. volume']
        ? Number.parseInt(gq['06. volume'], 10)
        : undefined,
      high: gq['03. high'] ? Number.parseFloat(gq['03. high']) : undefined,
      low: gq['04. low'] ? Number.parseFloat(gq['04. low']) : undefined,
      open: gq['02. open'] ? Number.parseFloat(gq['02. open']) : undefined,
      previousClose: gq['08. previous close']
        ? Number.parseFloat(gq['08. previous close'])
        : undefined,
      currency,
      timestamp: gq['07. latest trading day']
        ? new Date(gq['07. latest trading day']).toISOString()
        : new Date().toISOString(),
    };
  }

  private async fetch<T>(params: Record<string, string>): Promise<T> {
    const apiKey = this.config.get<string>('market.alphaVantageApiKey') ?? '';
    if (!apiKey) {
      throw new ServerError('Alpha Vantage API key is not configured');
    }

    const url = new URL('https://www.alphavantage.co/query');
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set('apikey', apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new ServerError(
        `Alpha Vantage request failed (${response.status})`,
      );
    }

    return (await response.json()) as T;
  }

  private assertNoRateLimit(data: {
    Note?: string;
    Information?: string;
  }): void {
    if (data.Note?.includes('API call frequency') || data.Information) {
      throw new TooManyRequests(
        data.Note ?? data.Information ?? 'Alpha Vantage rate limit',
      );
    }
  }
}
