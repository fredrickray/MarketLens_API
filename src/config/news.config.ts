import { registerAs } from '@nestjs/config';

export default registerAs('news', () => ({
  defaultProvider: process.env.NEWS_PROVIDER?.trim() || 'finnhub',
  finnhubApiKey: process.env.FINNHUB_API_KEY?.trim() ?? '',
  cacheTtlSeconds: Number.parseInt(
    process.env.NEWS_CACHE_TTL_SECONDS ?? '600',
    10,
  ),
  defaultDays: Number.parseInt(process.env.NEWS_DEFAULT_DAYS ?? '7', 10),
  defaultLimit: Number.parseInt(process.env.NEWS_DEFAULT_LIMIT ?? '20', 10),
  maxLimit: Number.parseInt(process.env.NEWS_MAX_LIMIT ?? '50', 10),
  syncCron: process.env.NEWS_SYNC_CRON?.trim() || '0 */6 * * *',
}));
