import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertType } from '../../core/enums/alert-type.enum';
import { RecommendationAction } from '../../core/enums/recommendation-action.enum';
import { MarketDataService } from '../../integrations/market-data/market-data.service';
import { AnalysisService } from '../analysis/analysis.service';
import { UsersService } from '../users/users.service';
import { AlertsNotificationService } from './alerts-notification.service';
import { AlertsRepository } from './alerts.repository';
import type { AlertDocument } from './schemas/alert.schema';

@Injectable()
export class AlertsEvaluationService {
  private readonly logger = new Logger(AlertsEvaluationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly repository: AlertsRepository,
    private readonly marketData: MarketDataService,
    private readonly analysis: AnalysisService,
    private readonly users: UsersService,
    private readonly notifications: AlertsNotificationService,
  ) {}

  async evaluateAllActive(): Promise<void> {
    const alerts = await this.repository.findActive();
    if (alerts.length === 0) {
      return;
    }

    const bySymbol = new Map<string, AlertDocument[]>();
    for (const alert of alerts) {
      const list = bySymbol.get(alert.symbol) ?? [];
      list.push(alert);
      bySymbol.set(alert.symbol, list);
    }

    for (const [symbol, symbolAlerts] of bySymbol) {
      try {
        await this.evaluateSymbolAlerts(symbol, symbolAlerts);
      } catch (error) {
        this.logger.warn(
          `Alert evaluation failed for ${symbol}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
  }

  private async evaluateSymbolAlerts(
    symbol: string,
    alerts: AlertDocument[],
  ): Promise<void> {
    const needsPrice = alerts.some((a) =>
      [
        AlertType.PRICE_ABOVE,
        AlertType.PRICE_BELOW,
        AlertType.PRICE_CHANGE_PERCENT,
      ].includes(a.type),
    );
    const needsAnalysis = alerts.some(
      (a) => a.type === AlertType.RECOMMENDATION_CHANGE,
    );

    const overview = needsPrice
      ? await this.marketData.getOverview(symbol)
      : null;
    const analysisResult = needsAnalysis
      ? await this.analysis.analyze(symbol)
      : null;

    const companyName =
      overview?.name ?? analysisResult?.data.overview?.name ?? symbol;

    for (const alert of alerts) {
      try {
        await this.evaluateSingleAlert(
          alert,
          overview,
          companyName,
          analysisResult?.data.recommendation,
        );
      } catch (error) {
        this.logger.warn(
          `Alert ${String(alert._id)} evaluation failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
  }

  private async evaluateSingleAlert(
    alert: AlertDocument,
    overview: Awaited<ReturnType<MarketDataService['getOverview']>> | null,
    companyName: string,
    recommendation?: {
      action: RecommendationAction;
      confidence: number;
      explanation: string;
    },
  ): Promise<void> {
    if (!this.isPastCooldown(alert)) {
      return;
    }

    let triggered = false;

    if (
      overview &&
      [
        AlertType.PRICE_ABOVE,
        AlertType.PRICE_BELOW,
        AlertType.PRICE_CHANGE_PERCENT,
      ].includes(alert.type)
    ) {
      triggered = await this.evaluatePriceAlert(alert, overview);
    }

    if (alert.type === AlertType.RECOMMENDATION_CHANGE && recommendation) {
      triggered = await this.evaluateRecommendationAlert(
        alert,
        recommendation,
        companyName,
      );
    }

    if (triggered) {
      await this.repository.updateById(
        String(alert._id),
        String(alert.userId),
        {
          lastTriggeredAt: new Date(),
        },
      );
    }
  }

  private async evaluatePriceAlert(
    alert: AlertDocument,
    overview: Awaited<ReturnType<MarketDataService['getOverview']>>,
  ): Promise<boolean> {
    const price = overview.quote.price;
    const changePercent = overview.quote.changePercent;
    const previousPrice =
      overview.quote.previousClose ?? alert.lastKnownPrice ?? price;

    let triggered = false;

    if (
      alert.type === AlertType.PRICE_ABOVE &&
      alert.targetPrice !== undefined
    ) {
      triggered = price >= alert.targetPrice;
    } else if (
      alert.type === AlertType.PRICE_BELOW &&
      alert.targetPrice !== undefined
    ) {
      triggered = price <= alert.targetPrice;
    } else if (
      alert.type === AlertType.PRICE_CHANGE_PERCENT &&
      alert.thresholdPercent !== undefined
    ) {
      triggered = Math.abs(changePercent) >= alert.thresholdPercent;
    }

    await this.repository.updateById(String(alert._id), String(alert.userId), {
      lastKnownPrice: price,
    });

    if (triggered && alert.notifyEmail) {
      const user = await this.users.findById(String(alert.userId));
      if (user) {
        await this.notifications.sendPriceAlert(alert, user.email, {
          symbol: alert.symbol,
          companyName: overview.name,
          currentPrice: price,
          previousPrice,
          changePercent,
        });
      }
    }

    return triggered;
  }

  private async evaluateRecommendationAlert(
    alert: AlertDocument,
    recommendation: {
      action: RecommendationAction;
      confidence: number;
      explanation: string;
    },
    companyName?: string,
  ): Promise<boolean> {
    const current = recommendation.action;
    const previous = alert.lastKnownAction;

    await this.repository.updateById(String(alert._id), String(alert.userId), {
      lastKnownAction: current,
    });

    if (previous === null || previous === undefined) {
      return false;
    }

    let triggered = previous !== current;
    if (triggered && alert.targetAction) {
      triggered = current === alert.targetAction;
    }

    if (triggered && alert.notifyEmail) {
      const user = await this.users.findById(String(alert.userId));
      if (user) {
        await this.notifications.sendRecommendationAlert(alert, user.email, {
          symbol: alert.symbol,
          companyName: companyName ?? alert.symbol,
          previousAction: previous,
          currentAction: current,
          confidence: recommendation.confidence,
          explanation: recommendation.explanation,
        });
      }
    }

    return triggered;
  }

  private isPastCooldown(alert: AlertDocument): boolean {
    if (!alert.lastTriggeredAt) {
      return true;
    }
    const cooldownMinutes =
      this.config.get<number>('alerts.cooldownMinutes') ?? 60;
    const elapsed = Date.now() - alert.lastTriggeredAt.getTime();
    return elapsed >= cooldownMinutes * 60 * 1000;
  }
}
