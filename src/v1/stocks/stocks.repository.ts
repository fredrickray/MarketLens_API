import { Injectable } from '@nestjs/common';
import { CACHE_KEYS } from '../../core/constants/cache-keys.constant';
import type {
  StockOverview,
  StockSearchResult,
} from '../../core/types/market.types';
import { RedisService } from '../../cache/redis.service';

@Injectable()
export class StocksRepository {
  constructor(private readonly redis: RedisService) {}

  getCachedSearch(query: string): Promise<StockSearchResult[] | null> {
    return this.redis.getJson<StockSearchResult[]>(
      CACHE_KEYS.stockSearch(query),
    );
  }

  getCachedOverview(symbol: string): Promise<StockOverview | null> {
    return this.redis.getJson<StockOverview>(CACHE_KEYS.stockOverview(symbol));
  }

  invalidateOverview(symbol: string): Promise<void> {
    return this.redis.del(CACHE_KEYS.stockOverview(symbol));
  }
}
