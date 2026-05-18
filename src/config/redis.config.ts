import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => {
  const url = process.env.REDIS_URL?.trim() ?? '';
  return {
    url,
    enabled: url.length > 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX?.trim() || 'marketlens:',
  };
});
