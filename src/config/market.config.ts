import { registerAs } from '@nestjs/config';

export default registerAs('market', () => ({
  defaultProvider: process.env.MARKET_DATA_PROVIDER?.trim() || 'finnhub',
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY?.trim() ?? '',
  finnhubApiKey: process.env.FINNHUB_API_KEY?.trim() ?? '',
  searchCacheTtlSeconds: Number.parseInt(
    process.env.MARKET_SEARCH_CACHE_TTL_SECONDS ?? '300',
    10,
  ),
  overviewCacheTtlSeconds: Number.parseInt(
    process.env.MARKET_OVERVIEW_CACHE_TTL_SECONDS ?? '60',
    10,
  ),
  warmSymbols: (process.env.MARKET_WARM_SYMBOLS ?? 'AAPL,MSFT,GOOGL,AMZN,NVDA')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
  cacheRefreshCron:
    process.env.MARKET_CACHE_REFRESH_CRON?.trim() || '*/15 * * * *',
  historyDays: Number.parseInt(process.env.MARKET_HISTORY_DAYS ?? '60', 10),
  historyCacheTtlSeconds: Number.parseInt(
    process.env.MARKET_HISTORY_CACHE_TTL_SECONDS ?? '3600',
    10,
  ),
}));
