import {
  ResourceNotFound,
  ServerError,
} from '../../../core/exceptions/http.errors';
import type { StockHistoricalSeries } from '../../../core/types/market.types';

interface YahooChartResult {
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      close?: (number | null)[];
      volume?: (number | null)[];
    }>;
  };
}

interface YahooChartResponse {
  chart?: {
    result?: YahooChartResult[];
  };
}

export async function fetchYahooHistoricalSeries(
  symbol: string,
  days: number,
  providerName: string,
): Promise<StockHistoricalSeries> {
  const range = days <= 30 ? '1mo' : days <= 90 ? '3mo' : '6mo';
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
  );
  url.searchParams.set('interval', '1d');
  url.searchParams.set('range', range);

  const response = await fetch(url, {
    headers: { 'User-Agent': 'MarketLens/1.0' },
  });
  if (!response.ok) {
    throw new ServerError(`Yahoo historical fetch failed (${response.status})`);
  }

  const data = (await response.json()) as YahooChartResponse;
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const volumes = result?.indicators?.quote?.[0]?.volume ?? [];

  const prices: number[] = [];
  const volume: number[] = [];
  const isoTimestamps: string[] = [];

  for (let i = 0; i < timestamps.length; i += 1) {
    const close = closes[i];
    if (close === null || close === undefined) {
      continue;
    }
    prices.push(close);
    volume.push(volumes[i] ?? 0);
    isoTimestamps.push(new Date((timestamps[i] ?? 0) * 1000).toISOString());
  }

  const trimmed = sliceLastN(prices, volume, isoTimestamps, days);
  if (trimmed.prices.length < 5) {
    throw new ResourceNotFound(`Insufficient historical data for ${symbol}`);
  }

  return {
    symbol: symbol.toUpperCase(),
    prices: trimmed.prices,
    volume: trimmed.volume,
    timestamps: trimmed.timestamps,
    provider: providerName,
  };
}

function sliceLastN(
  prices: number[],
  volume: number[],
  timestamps: string[],
  days: number,
): { prices: number[]; volume: number[]; timestamps: string[] } {
  const start = Math.max(0, prices.length - days);
  return {
    prices: prices.slice(start),
    volume: volume.slice(start),
    timestamps: timestamps.slice(start),
  };
}
