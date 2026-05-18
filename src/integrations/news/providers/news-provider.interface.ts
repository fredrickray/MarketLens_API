import type { StockNewsArticle } from '../../../core/types/news.types';

export interface NewsFetchOptions {
  days?: number;
  limit?: number;
}

export interface NewsProvider {
  readonly name: string;
  isConfigured(): boolean;
  fetchCompanyNews(
    symbol: string,
    options?: NewsFetchOptions,
  ): Promise<StockNewsArticle[]>;
}

export const NEWS_PROVIDERS = Symbol('NEWS_PROVIDERS');
