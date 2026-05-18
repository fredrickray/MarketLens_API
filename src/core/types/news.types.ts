export interface StockNewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  category?: string;
  imageUrl?: string;
  relatedSymbols?: string[];
}

export interface StockNewsFeed {
  symbol: string;
  articles: StockNewsArticle[];
  provider: string;
  fetchedAt: string;
}
