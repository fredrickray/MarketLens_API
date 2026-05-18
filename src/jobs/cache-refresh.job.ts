import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { MarketDataService } from '../integrations/market-data/market-data.service';

@Injectable()
export class CacheRefreshJob {
  private readonly logger = new Logger(CacheRefreshJob.name);

  constructor(
    private readonly config: ConfigService,
    private readonly marketData: MarketDataService,
  ) {}

  /** Every 15 minutes — override via MARKET_CACHE_REFRESH_CRON in a future config hook */
  @Cron('*/15 * * * *')
  async refreshWarmOverviews(): Promise<void> {
    if (this.config.get<string>('app.nodeEnv') === 'test') {
      return;
    }

    const symbols = this.config.get<string[]>('market.warmSymbols') ?? [];
    if (symbols.length === 0) {
      return;
    }

    this.logger.log(`Refreshing overview cache for ${symbols.length} symbols`);
    await Promise.all(
      symbols.map((symbol) => this.marketData.warmSymbol(symbol)),
    );
  }
}
