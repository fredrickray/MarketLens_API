import appConfig from './app.config';
import alertsConfig from './alerts.config';
import guestConfig from './guest.config';
import securityConfig from './security.config';
import complianceConfig from './compliance.config';
import databaseConfig from './database.config';
import marketConfig from './market.config';
import mlConfig from './ml.config';
import newsConfig from './news.config';
import redisConfig from './redis.config';

export const configLoaders = [
  appConfig,
  databaseConfig,
  redisConfig,
  marketConfig,
  mlConfig,
  complianceConfig,
  newsConfig,
  alertsConfig,
  guestConfig,
  securityConfig,
];

export {
  appConfig,
  databaseConfig,
  redisConfig,
  marketConfig,
  mlConfig,
  complianceConfig,
  newsConfig,
  alertsConfig,
  guestConfig,
  securityConfig,
};
