import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Types } from 'mongoose';
import { AlertType } from '../../core/enums/alert-type.enum';
import { alertsConfig } from '../../config';
import { AlertsRepository } from './alerts.repository';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  let service: AlertsService;

  const user = {
    _id: new Types.ObjectId(),
    email: 'user@example.com',
  } as never;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [alertsConfig], isGlobal: true })],
      providers: [
        AlertsService,
        {
          provide: AlertsRepository,
          useValue: {
            countByUser: jest.fn().mockResolvedValue(0),
            create: jest.fn().mockImplementation((data) =>
              Promise.resolve({
                _id: new Types.ObjectId(),
                ...data,
                createdAt: new Date(),
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get(AlertsService);
  });

  it('creates a price above alert', async () => {
    const result = await service.create(user, {
      symbol: 'AAPL',
      type: AlertType.PRICE_ABOVE,
      targetPrice: 200,
    });

    expect(result.data.symbol).toBe('AAPL');
    expect(result.data.type).toBe(AlertType.PRICE_ABOVE);
    expect(result.data.targetPrice).toBe(200);
  });
});
