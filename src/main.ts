import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  if (config.get<boolean>('security.trustProxy')) {
    const httpAdapter = app.getHttpAdapter().getInstance() as {
      set: (setting: string, value: unknown) => void;
    };
    httpAdapter.set('trust proxy', 1);
  }

  app.use(cookieParser());
  app.use(
    session({
      secret: config.getOrThrow<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      name: 'marketlens.sid',
      cookie: {
        maxAge: 10 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax',
        secure: config.get<string>('NODE_ENV') === 'production',
      },
    }),
  );

  app.use(helmet());

  const corsOrigins = config.get<string>('CORS_ORIGINS');
  app.enableCors(
    corsOrigins
      ? {
          origin: corsOrigins
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean),
          credentials: true,
        }
      : { origin: true, credentials: true },
  );

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port);
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
