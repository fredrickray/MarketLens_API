import { registerAs } from '@nestjs/config';

export default registerAs('compliance', () => ({
  volatilityWarningPercent: Number.parseFloat(
    process.env.COMPLIANCE_VOLATILITY_WARNING_PCT ?? '5',
  ),
  informationalConfidenceMax: Number.parseFloat(
    process.env.COMPLIANCE_INFORMATIONAL_CONFIDENCE_MAX ?? '0.5',
  ),
  auditRetentionDays: Number.parseInt(
    process.env.COMPLIANCE_AUDIT_RETENTION_DAYS ?? '365',
    10,
  ),
  auditHistoryDefaultLimit: Number.parseInt(
    process.env.COMPLIANCE_AUDIT_HISTORY_LIMIT ?? '20',
    10,
  ),
}));
