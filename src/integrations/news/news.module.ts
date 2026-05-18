import { Module } from '@nestjs/common';
import { FinnhubNewsProvider } from './providers/finnhub-news.provider';
import { NEWS_PROVIDERS } from './providers/news-provider.interface';
import { MockNewsProvider } from './providers/mock-news.provider';
import { NewsIntegrationService } from './news.service';

@Module({
  providers: [
    FinnhubNewsProvider,
    MockNewsProvider,
    {
      provide: NEWS_PROVIDERS,
      useFactory: (finnhub: FinnhubNewsProvider, mock: MockNewsProvider) => [
        finnhub,
        mock,
      ],
      inject: [FinnhubNewsProvider, MockNewsProvider],
    },
    NewsIntegrationService,
  ],
  exports: [NewsIntegrationService],
})
export class NewsIntegrationModule {}
