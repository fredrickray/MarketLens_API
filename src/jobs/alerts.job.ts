import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { AlertsEvaluationService } from '../v1/alerts/alerts-evaluation.service';

@Injectable()
export class AlertsJob {
  private readonly logger = new Logger(AlertsJob.name);

  constructor(
    private readonly config: ConfigService,
    private readonly evaluation: AlertsEvaluationService,
  ) {}

  /** Every 5 minutes */
  @Cron('*/5 * * * *')
  async evaluateAlerts(): Promise<void> {
    if (this.config.get<string>('app.nodeEnv') === 'test') {
      return;
    }

    this.logger.log('Evaluating active alerts');
    await this.evaluation.evaluateAllActive();
  }
}
