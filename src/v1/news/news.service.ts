import { Injectable } from '@nestjs/common';
import { FINANCIAL_DISCLAIMER } from '../../core/constants/disclaimer.constant';
import { NewsIntegrationService } from '../../integrations/news/news.service';
import type { NewsQueryDto } from './dto/news-query.dto';

@Injectable()
export class NewsService {
  constructor(private readonly newsIntegration: NewsIntegrationService) {}

  getNews(symbol: string, query: NewsQueryDto) {
    return this.newsIntegration
      .getCompanyNews(symbol, {
        days: query.days,
        limit: query.limit,
      })
      .then((feed) => ({
        data: {
          symbol: feed.symbol,
          articles: feed.articles,
          fetchedAt: feed.fetchedAt,
        },
        meta: {
          cached: feed.cached,
          provider: feed.provider,
          days: query.days,
          limit: query.limit ?? feed.articles.length,
          count: feed.articles.length,
        },
        disclaimer: FINANCIAL_DISCLAIMER,
      }));
  }
}
