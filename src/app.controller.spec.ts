import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthService } from './core/health/health.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('0.0.1') },
        },
        {
          provide: HealthService,
          useValue: {
            getHealth: jest.fn().mockResolvedValue({
              status: 'ok',
              timestamp: new Date().toISOString(),
              version: '0.0.1',
              environment: 'test',
              checks: {
                database: { status: 'up' },
                redis: { status: 'skipped' },
                ml: { status: 'mock' },
              },
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('getHealth', () => {
    it('returns ok status', async () => {
      const result = await appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
      expect(result.checks.database.status).toBe('up');
    });
  });
});
