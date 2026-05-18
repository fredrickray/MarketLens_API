import { Module } from '@nestjs/common';
import { AlphaVantageProvider } from './providers/alpha-vantage.provider';
import { FinnhubProvider } from './providers/finnhub.provider';
import { MARKET_DATA_PROVIDERS } from './providers/market-data-provider.interface';
import { MockMarketProvider } from './providers/mock-market.provider';
import { YahooProvider } from './providers/yahoo.provider';
import { MarketDataService } from './market-data.service';

@Module({
  providers: [
    FinnhubProvider,
    AlphaVantageProvider,
    YahooProvider,
    MockMarketProvider,
    {
      provide: MARKET_DATA_PROVIDERS,
      useFactory: (
        finnhub: FinnhubProvider,
        alphaVantage: AlphaVantageProvider,
        yahoo: YahooProvider,
        mock: MockMarketProvider,
      ) => [finnhub, alphaVantage, yahoo, mock],
      inject: [
        FinnhubProvider,
        AlphaVantageProvider,
        YahooProvider,
        MockMarketProvider,
      ],
    },
    MarketDataService,
  ],
  exports: [MarketDataService],
})
export class MarketDataModule {}
