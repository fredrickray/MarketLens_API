import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerError } from '../../../core/exceptions/http.errors';
import type { StockNewsArticle } from '../../../core/types/news.types';
import type { NewsFetchOptions, NewsProvider } from './news-provider.interface';

interface FinnhubNewsItem {
  id?: number;
  headline?: string;
  summary?: string;
  source?: string;
  url?: string;
  datetime?: number;
  category?: string;
  image?: string;
  related?: string;
}

@Injectable()
export class FinnhubNewsProvider implements NewsProvider {
  readonly name = 'finnhub';

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const key =
      this.config.get<string>('news.finnhubApiKey') ??
      this.config.get<string>('market.finnhubApiKey') ??
      '';
    return key.length > 0;
  }

  async fetchCompanyNews(
    symbol: string,
    options: NewsFetchOptions = {},
  ): Promise<StockNewsArticle[]> {
    const token = this.requireApiKey();
    const days =
      options.days ?? this.config.get<number>('news.defaultDays') ?? 7;
    const limit =
      options.limit ?? this.config.get<number>('news.defaultLimit') ?? 20;

    const to = new Date();
    const from = new Date(to.getTime() - days * 86_400_000);

    const url = new URL('https://finnhub.io/api/v1/company-news');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('from', formatDate(from));
    url.searchParams.set('to', formatDate(to));
    url.searchParams.set('token', token);

    const response = await fetch(url);
    if (!response.ok) {
      throw new ServerError(`Finnhub news failed (${response.status})`);
    }

    const items = (await response.json()) as FinnhubNewsItem[];
    return (items ?? [])
      .slice(0, limit)
      .map((item) => this.normalize(symbol, item));
  }

  private normalize(symbol: string, item: FinnhubNewsItem): StockNewsArticle {
    return {
      id: String(item.id ?? `${symbol}-${item.datetime ?? Date.now()}`),
      headline: item.headline ?? 'Untitled',
      summary: truncate(item.summary ?? '', 500),
      source: item.source ?? 'Unknown',
      url: item.url ?? '',
      publishedAt: item.datetime
        ? new Date(item.datetime * 1000).toISOString()
        : new Date().toISOString(),
      category: item.category,
      imageUrl: item.image,
      relatedSymbols: item.related
        ? item.related.split(',').map((s) => s.trim().toUpperCase())
        : [symbol],
    };
  }

  private requireApiKey(): string {
    const key =
      this.config.get<string>('news.finnhubApiKey') ??
      this.config.get<string>('market.finnhubApiKey') ??
      '';
    if (!key) {
      throw new ServerError('Finnhub API key is not configured for news');
    }
    return key;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 3)}...`;
}
