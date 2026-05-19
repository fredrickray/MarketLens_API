import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  defaultRateLimitPerMinute: Number.parseInt(
    process.env.SECURITY_DEFAULT_RATE_LIMIT_PER_MINUTE ??
      process.env.AUTH_RATE_LIMIT_PER_MINUTE ??
      '120',
    10,
  ),
  authRateLimitPerMinute: Number.parseInt(
    process.env.SECURITY_AUTH_RATE_LIMIT_PER_MINUTE ?? '30',
    10,
  ),
  analysisRateLimitPerMinute: Number.parseInt(
    process.env.SECURITY_ANALYSIS_RATE_LIMIT_PER_MINUTE ?? '30',
    10,
  ),
  securityAuditRetentionDays: Number.parseInt(
    process.env.SECURITY_AUDIT_RETENTION_DAYS ?? '90',
    10,
  ),
  securityAuditDefaultLimit: Number.parseInt(
    process.env.SECURITY_AUDIT_DEFAULT_LIMIT ?? '50',
    10,
  ),
  trustProxy: process.env.TRUST_PROXY === 'true',
}));
