import { Injectable } from '@nestjs/common';
import { ResourceNotFound } from '../../../core/exceptions/http.errors';
import type {
  StockHistoricalSeries,
  StockOverview,
  StockSearchResult,
} from '../../../core/types/market.types';
import type { MarketDataProvider } from './market-data-provider.interface';

const MOCK_UNIVERSE: StockSearchResult[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    type: 'EQUITY',
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    exchange: 'NASDAQ',
    type: 'EQUITY',
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    exchange: 'NASDAQ',
    type: 'EQUITY',
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    exchange: 'NASDAQ',
    type: 'EQUITY',
  },
];

const MOCK_PRICES: Record<string, number> = {
  AAPL: 198.5,
  MSFT: 425.2,
  GOOGL: 175.8,
  AMZN: 188.4,
  NVDA: 875.1,
};

@Injectable()
export class MockMarketProvider implements MarketDataProvider {
  readonly name = 'mock';

  isConfigured(): boolean {
    return true;
  }

  searchSymbols(query: string, limit = 10): Promise<StockSearchResult[]> {
    const q = query.toLowerCase();
    return Promise.resolve(
      MOCK_UNIVERSE.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q),
      ).slice(0, limit),
    );
  }

  getHistoricalSeries(
    symbol: string,
    days = 60,
  ): Promise<StockHistoricalSeries> {
    const base = MOCK_PRICES[symbol];
    if (base === undefined) {
      throw new ResourceNotFound(`Symbol ${symbol} not found in mock data`);
    }

    const count = Math.min(days, 60);
    const prices: number[] = [];
    const volume: number[] = [];
    const timestamps: string[] = [];
    const now = Date.now();

    for (let i = count - 1; i >= 0; i -= 1) {
      const drift = (count - i) * 0.15;
      prices.push(Number((base - drift + (i % 3) * 0.2).toFixed(2)));
      volume.push(40_000_000 + i * 100_000);
      timestamps.push(new Date(now - i * 86_400_000).toISOString());
    }

    return Promise.resolve({
      symbol,
      prices,
      volume,
      timestamps,
      provider: this.name,
    });
  }

  getOverview(symbol: string): Promise<StockOverview> {
    const match = MOCK_UNIVERSE.find((s) => s.symbol === symbol);
    const price = MOCK_PRICES[symbol];
    if (!match || price === undefined) {
      throw new ResourceNotFound(`Symbol ${symbol} not found in mock data`);
    }

    const change = 1.25;
    return Promise.resolve({
      ...match,
      symbol,
      quote: {
        symbol,
        price,
        change,
        changePercent: (change / price) * 100,
        volume: 45_000_000,
        currency: 'USD',
        timestamp: new Date().toISOString(),
      },
      sector: 'Technology',
      description: `Mock overview for ${match.name}. Configure market API keys for live data.`,
      provider: this.name,
    });
  }
}
