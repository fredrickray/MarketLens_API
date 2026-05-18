import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './cache/redis.module';
import { configLoaders } from './config';
import { envValidationSchema } from './config/env.validation';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';
import { HealthModule } from './core/health/health.module';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { DatabaseModule } from './database/database.module';
import { MlModule } from './integrations/ml-service/ml.module';
import { JobsModule } from './jobs/jobs.module';
import { V1Module } from './v1/v1.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: configLoaders,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 120 }]),
    RedisModule,
    MlModule,
    DatabaseModule,
    HealthModule,
    JobsModule,
    V1Module,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
