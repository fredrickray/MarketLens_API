import { registerAs } from '@nestjs/config';

export default registerAs('alerts', () => ({
  evalCron: process.env.ALERTS_EVAL_CRON?.trim() || '*/5 * * * *',
  cooldownMinutes: Number.parseInt(
    process.env.ALERTS_COOLDOWN_MINUTES ?? '60',
    10,
  ),
  maxPerUser: Number.parseInt(process.env.ALERTS_MAX_PER_USER ?? '25', 10),
}));
