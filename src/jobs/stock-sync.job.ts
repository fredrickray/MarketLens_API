import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MarketDataService } from '../integrations/market-data/market-data.service';

@Injectable()
export class StockSyncJob {
  private readonly logger = new Logger(StockSyncJob.name);

  constructor(
    private readonly config: ConfigService,
    private readonly marketData: MarketDataService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async warmPopularSymbols(): Promise<void> {
    if (this.config.get<string>('app.nodeEnv') === 'test') {
      return;
    }

    const symbols = this.config.get<string[]>('market.warmSymbols') ?? [];
    if (symbols.length === 0) {
      return;
    }

    this.logger.log(`Warming cache for ${symbols.length} symbols`);
    await Promise.all(
      symbols.map((symbol) => this.marketData.warmSymbol(symbol)),
    );
  }
}
