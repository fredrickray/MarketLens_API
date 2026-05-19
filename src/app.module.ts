import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RequestContextModule } from './core/context/request-context.module';
import { RequestIdMiddleware } from './core/middleware/request-id.middleware';
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
    RequestContextModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: 60_000,
          limit:
            config.get<number>('security.defaultRateLimitPerMinute') ?? 120,
        },
        {
          name: 'auth',
          ttl: 60_000,
          limit: config.get<number>('security.authRateLimitPerMinute') ?? 30,
        },
        {
          name: 'analysis',
          ttl: 60_000,
          limit:
            config.get<number>('security.analysisRateLimitPerMinute') ?? 30,
        },
      ],
    }),
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
