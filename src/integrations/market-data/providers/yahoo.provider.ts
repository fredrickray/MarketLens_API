import { Injectable } from '@nestjs/common';
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
import { fetchYahooHistoricalSeries } from './yahoo-chart.util';

interface YahooSearchResponse {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    exchange?: string;
    quoteType?: string;
  }>;
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        shortName?: string;
        longName?: string;
        exchangeName?: string;
        fullExchangeName?: string;
        currency?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        regularMarketVolume?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketOpen?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
      };
    }>;
  };
}

@Injectable()
export class YahooProvider implements MarketDataProvider {
  readonly name = 'yahoo';

  isConfigured(): boolean {
    return true;
  }

  async searchSymbols(query: string, limit = 10): Promise<StockSearchResult[]> {
    const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
    url.searchParams.set('q', query);
    url.searchParams.set('quotesCount', String(limit));

    const response = await fetch(url, {
      headers: { 'User-Agent': 'MarketLens/1.0' },
    });
    if (!response.ok) {
      throw new ServerError(`Yahoo search failed (${response.status})`);
    }

    const data = (await response.json()) as YahooSearchResponse;
    return (data.quotes ?? [])
      .filter((q) => q.symbol)
      .slice(0, limit)
      .map((q) => ({
        symbol: q.symbol!.toUpperCase(),
        name: q.longname ?? q.shortname ?? q.symbol!,
        exchange: q.exchange,
        type: q.quoteType,
      }));
  }

  getHistoricalSeries(
    symbol: string,
    days = 60,
  ): Promise<StockHistoricalSeries> {
    return fetchYahooHistoricalSeries(symbol, days, this.name);
  }

  async getOverview(symbol: string): Promise<StockOverview> {
    const url = new URL(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
    );
    url.searchParams.set('interval', '1d');
    url.searchParams.set('range', '1d');

    const response = await fetch(url, {
      headers: { 'User-Agent': 'MarketLens/1.0' },
    });
    if (!response.ok) {
      throw new ServerError(`Yahoo chart failed (${response.status})`);
    }

    const data = (await response.json()) as YahooChartResponse;
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) {
      throw new ResourceNotFound(`No quote data for ${symbol}`);
    }

    const quote = this.mapQuote(symbol, meta);
    return {
      symbol,
      name: meta.longName ?? meta.shortName ?? meta.symbol ?? symbol,
      exchange: meta.fullExchangeName ?? meta.exchangeName,
      quote,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      provider: this.name,
    };
  }

  private mapQuote(
    symbol: string,
    meta: NonNullable<
      NonNullable<YahooChartResponse['chart']>['result']
    >[0]['meta'],
  ): StockQuote {
    const price = meta!.regularMarketPrice ?? 0;
    const previousClose = meta!.chartPreviousClose ?? price;
    const change = price - previousClose;
    const changePercent =
      previousClose === 0 ? 0 : (change / previousClose) * 100;

    return {
      symbol,
      price,
      change,
      changePercent,
      volume: meta!.regularMarketVolume,
      high: meta!.regularMarketDayHigh,
      low: meta!.regularMarketDayLow,
      open: meta!.regularMarketOpen,
      previousClose,
      currency: meta!.currency,
      timestamp: new Date().toISOString(),
    };
  }
}
