import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketDataModule } from '../../integrations/market-data/market-data.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AlertsEvaluationService } from './alerts-evaluation.service';
import { AlertsNotificationService } from './alerts-notification.service';
import { AlertsController } from './alerts.controller';
import { AlertsRepository } from './alerts.repository';
import { AlertsService } from './alerts.service';
import { Alert, AlertSchema } from './schemas/alert.schema';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    MailModule,
    MarketDataModule,
    AnalysisModule,
    MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }]),
  ],
  controllers: [AlertsController],
  providers: [
    AlertsService,
    AlertsRepository,
    AlertsNotificationService,
    AlertsEvaluationService,
  ],
  exports: [AlertsEvaluationService],
})
export class AlertsModule {}
