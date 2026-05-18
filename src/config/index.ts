import appConfig from './app.config';
import databaseConfig from './database.config';
import marketConfig from './market.config';
import mlConfig from './ml.config';
import redisConfig from './redis.config';

export const configLoaders = [
  appConfig,
  databaseConfig,
  redisConfig,
  marketConfig,
  mlConfig,
];

export { appConfig, databaseConfig, redisConfig, marketConfig, mlConfig };
