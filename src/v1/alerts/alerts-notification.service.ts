import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertType } from '../../core/enums/alert-type.enum';
import { RecommendationAction } from '../../core/enums/recommendation-action.enum';
import { MailService } from '../mail/mail.interface';
import type { AlertDocument } from './schemas/alert.schema';

export interface PriceTriggerContext {
  symbol: string;
  companyName: string;
  currentPrice: number;
  previousPrice?: number;
  changePercent?: number;
}

export interface RecommendationTriggerContext {
  symbol: string;
  companyName: string;
  previousAction: RecommendationAction | null;
  currentAction: RecommendationAction;
  confidence: number;
  explanation: string;
}

@Injectable()
export class AlertsNotificationService {
  private readonly logger = new Logger(AlertsNotificationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async sendPriceAlert(
    alert: AlertDocument,
    email: string,
    context: PriceTriggerContext,
  ): Promise<void> {
    const placeholders = this.basePlaceholders(alert, context.symbol, email);
    placeholders.company_name = context.companyName;
    placeholders.current_price = this.formatPrice(context.currentPrice);

    let templateName = 'price-change-alert';
    let subject = `${context.symbol} price alert`;

    if (alert.type === AlertType.PRICE_ABOVE) {
      templateName = 'price-above-alert';
      subject = `${context.symbol} is above $${alert.targetPrice}`;
      placeholders.target_price = this.formatPrice(alert.targetPrice ?? 0);
    } else if (alert.type === AlertType.PRICE_BELOW) {
      templateName = 'price-below-alert';
      subject = `${context.symbol} is below $${alert.targetPrice}`;
      placeholders.target_price = this.formatPrice(alert.targetPrice ?? 0);
    } else if (alert.type === AlertType.PRICE_CHANGE_PERCENT) {
      subject = `${context.symbol} moved ${Math.abs(context.changePercent ?? 0).toFixed(2)}%`;
      placeholders.percent_change = (context.changePercent ?? 0).toFixed(2);
      placeholders.threshold_percent = String(alert.thresholdPercent ?? 0);
      placeholders.time_window = '1 day';
      placeholders.previous_price = this.formatPrice(
        context.previousPrice ?? context.currentPrice,
      );
      placeholders.change_color =
        (context.changePercent ?? 0) >= 0 ? '#22C55E' : '#DC2626';
    }

    await this.dispatch(email, subject, templateName, placeholders);
  }

  async sendRecommendationAlert(
    alert: AlertDocument,
    email: string,
    context: RecommendationTriggerContext,
  ): Promise<void> {
    const placeholders = this.basePlaceholders(alert, context.symbol, email);
    placeholders.company_name = context.companyName;
    placeholders.previous_action = context.previousAction ?? 'none';
    placeholders.current_action = context.currentAction;
    placeholders.confidence = `${Math.round(context.confidence * 100)}%`;
    placeholders.explanation = context.explanation;

    const subject = `${context.symbol} recommendation: ${context.currentAction}`;
    await this.dispatch(
      email,
      subject,
      'recommendation-change-alert',
      placeholders,
    );
  }

  private basePlaceholders(
    alert: AlertDocument,
    symbol: string,
    email: string,
  ): Record<string, string> {
    const publicUrl =
      this.config.get<string>('app.publicUrl') ?? 'http://localhost:3000';
    return {
      symbol,
      alert_id: String(alert._id),
      triggered_at: new Date().toUTCString(),
      analysis_url: `${publicUrl}/stocks/${symbol}/analysis`,
      alerts_url: `${publicUrl}/alerts`,
      user_email: email,
    };
  }

  private async dispatch(
    to: string,
    subject: string,
    templateName: string,
    placeholders: Record<string, string>,
  ): Promise<void> {
    try {
      await this.mail.sendMail({
        to,
        subject,
        templateName,
        placeholders,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send alert email to ${to}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  private formatPrice(value: number): string {
    return `$${value.toFixed(2)}`;
  }
}
