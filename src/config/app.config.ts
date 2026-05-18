import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '4000', 10),
  corsOrigins: process.env.CORS_ORIGINS ?? '',
  name: 'MarketLens API',
  version: process.env.npm_package_version ?? '0.0.1',
  publicUrl: process.env.APP_PUBLIC_URL?.trim() || 'http://localhost:3000',
}));
