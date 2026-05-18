import { registerAs } from '@nestjs/config';

export default registerAs('guest', () => ({
  sessionTtlDays: Number.parseInt(
    process.env.GUEST_SESSION_TTL_DAYS ?? '7',
    10,
  ),
  rateLimitPerMinute: Number.parseInt(
    process.env.GUEST_RATE_LIMIT_PER_MINUTE ?? '40',
    10,
  ),
  authenticatedRateLimitPerMinute: Number.parseInt(
    process.env.AUTH_RATE_LIMIT_PER_MINUTE ?? '120',
    10,
  ),
}));
