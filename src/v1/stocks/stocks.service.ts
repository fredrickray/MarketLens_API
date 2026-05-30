import { Injectable } from '@nestjs/common';
import { FINANCIAL_DISCLAIMER } from '../../core/constants/disclaimer.constant';
import { MarketDataService } from '../../integrations/market-data/market-data.service';

@Injectable()
export class StocksService {
  constructor(private readonly marketData: MarketDataService) {}

  search(query: string, limit?: number) {
    return this.marketData.searchSymbols(query, limit).then((payload) => ({
      data: payload.results,
      meta: {
        query,
        limit: limit ?? 10,
        cached: payload.cached,
        provider: payload.provider,
      },
      disclaimer: FINANCIAL_DISCLAIMER,
    }));
  }

  getOverview(symbol: string) {
    return this.marketData.getOverview(symbol).then((overview) => {
      const { cached, ...data } = overview;
      return {
        data,
        meta: {
          cached,
          provider: overview.provider,
        },
        disclaimer: FINANCIAL_DISCLAIMER,
      };
    });
  }

  getHistory(symbol: string, days?: number) {
    return this.marketData.getHistoricalSeries(symbol, days).then((series) => {
      const { cached, ...data } = series;
      return {
        data,
        meta: {
          cached,
          provider: series.provider,
          days: data.prices.length,
        },
        disclaimer: FINANCIAL_DISCLAIMER,
      };
    });
  }
}
