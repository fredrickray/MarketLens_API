import type {
  StockHistoricalSeries,
  StockOverview,
  StockSearchResult,
} from '../../../core/types/market.types';

export interface MarketDataProvider {
  readonly name: string;
  isConfigured(): boolean;
  searchSymbols(query: string, limit?: number): Promise<StockSearchResult[]>;
  getOverview(symbol: string): Promise<StockOverview>;
  getHistoricalSeries(
    symbol: string,
    days?: number,
  ): Promise<StockHistoricalSeries>;
}

export const MARKET_DATA_PROVIDERS = Symbol('MARKET_DATA_PROVIDERS');
