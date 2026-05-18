import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { NewsIntegrationService } from '../integrations/news/news.service';

@Injectable()
export class NewsSyncJob {
  private readonly logger = new Logger(NewsSyncJob.name);

  constructor(
    private readonly config: ConfigService,
    private readonly news: NewsIntegrationService,
  ) {}

  /** Every 6 hours */
  @Cron('0 */6 * * *')
  async syncWarmSymbolNews(): Promise<void> {
    if (this.config.get<string>('app.nodeEnv') === 'test') {
      return;
    }

    const symbols = this.config.get<string[]>('market.warmSymbols') ?? [];
    if (symbols.length === 0) {
      return;
    }

    const days = this.config.get<number>('news.defaultDays') ?? 7;
    this.logger.log(`Syncing news cache for ${symbols.length} symbols`);

    await Promise.all(
      symbols.map((symbol) => this.news.warmSymbol(symbol, days)),
    );
  }
}
