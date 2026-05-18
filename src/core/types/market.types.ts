export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  currency?: string;
  timestamp: string;
}

export interface StockHistoricalSeries {
  symbol: string;
  prices: number[];
  volume: number[];
  timestamps: string[];
  provider: string;
}

export interface StockOverview {
  symbol: string;
  name: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  description?: string;
  marketCap?: number;
  quote: StockQuote;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  provider: string;
  cachedAt?: string;
}
