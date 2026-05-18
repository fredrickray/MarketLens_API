import { Injectable } from '@nestjs/common';
import type { StockNewsArticle } from '../../../core/types/news.types';
import type { NewsFetchOptions, NewsProvider } from './news-provider.interface';

const MOCK_NEWS: Record<string, StockNewsArticle[]> = {
  AAPL: [
    {
      id: 'mock-aapl-1',
      headline: 'Apple reports steady services growth',
      summary:
        'Mock article: Apple continues to expand its services segment amid stable hardware demand.',
      source: 'MarketLens Mock',
      url: 'https://example.com/news/aapl-1',
      publishedAt: new Date(Date.now() - 86_400_000).toISOString(),
      category: 'company',
      relatedSymbols: ['AAPL'],
    },
    {
      id: 'mock-aapl-2',
      headline: 'Analysts watch Apple supply chain into next quarter',
      summary:
        'Mock article: Supply chain indicators remain a focus for institutional investors.',
      source: 'MarketLens Mock',
      url: 'https://example.com/news/aapl-2',
      publishedAt: new Date(Date.now() - 172_800_000).toISOString(),
      category: 'company',
      relatedSymbols: ['AAPL'],
    },
  ],
  MSFT: [
    {
      id: 'mock-msft-1',
      headline: 'Microsoft cloud revenue in focus',
      summary: 'Mock article: Azure growth remains a key driver for sentiment.',
      source: 'MarketLens Mock',
      url: 'https://example.com/news/msft-1',
      publishedAt: new Date(Date.now() - 86_400_000).toISOString(),
      category: 'company',
      relatedSymbols: ['MSFT'],
    },
  ],
};

@Injectable()
export class MockNewsProvider implements NewsProvider {
  readonly name = 'mock';

  isConfigured(): boolean {
    return true;
  }

  fetchCompanyNews(
    symbol: string,
    options: NewsFetchOptions = {},
  ): Promise<StockNewsArticle[]> {
    const limit = options.limit ?? 20;
    const articles = MOCK_NEWS[symbol.toUpperCase()] ?? [];
    return Promise.resolve(articles.slice(0, limit));
  }
}
