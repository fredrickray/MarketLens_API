import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Types } from 'mongoose';
import { AlertType } from '../../core/enums/alert-type.enum';
import { alertsConfig } from '../../config';
import { MarketDataService } from '../../integrations/market-data/market-data.service';
import { AnalysisService } from '../analysis/analysis.service';
import { UsersService } from '../users/users.service';
import { AlertsNotificationService } from './alerts-notification.service';
import { AlertsRepository } from './alerts.repository';
import { AlertsEvaluationService } from './alerts-evaluation.service';

describe('AlertsEvaluationService', () => {
  let service: AlertsEvaluationService;
  const sendPriceAlert = jest.fn().mockResolvedValue(undefined);

  const userId = new Types.ObjectId();
  const alert = {
    _id: new Types.ObjectId(),
    userId,
    symbol: 'AAPL',
    type: AlertType.PRICE_ABOVE,
    targetPrice: 150,
    isActive: true,
    notifyEmail: true,
    lastTriggeredAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [alertsConfig], isGlobal: true })],
      providers: [
        AlertsEvaluationService,
        {
          provide: AlertsRepository,
          useValue: {
            findActive: jest.fn().mockResolvedValue([alert]),
            updateById: jest.fn().mockResolvedValue(alert),
          },
        },
        {
          provide: MarketDataService,
          useValue: {
            getOverview: jest.fn().mockResolvedValue({
              symbol: 'AAPL',
              name: 'Apple Inc.',
              quote: { price: 200, changePercent: 2, previousClose: 190 },
              provider: 'mock',
              cached: false,
            }),
          },
        },
        {
          provide: AnalysisService,
          useValue: { analyze: jest.fn() },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn().mockResolvedValue({
              _id: userId,
              email: 'user@example.com',
            }),
          },
        },
        {
          provide: AlertsNotificationService,
          useValue: {
            sendPriceAlert,
            sendRecommendationAlert: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(AlertsEvaluationService);
  });

  it('triggers price above alert and sends email', async () => {
    await service.evaluateAllActive();
    expect(sendPriceAlert).toHaveBeenCalled();
  });
});
