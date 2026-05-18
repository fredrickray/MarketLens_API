import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(4000),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  SESSION_SECRET: Joi.string()
    .min(16)
    .default('local-dev-session-secret-change-me'),
  CORS_ORIGINS: Joi.string().optional().allow(''),
  MAX_LOGIN_ATTEMPTS: Joi.number().integer().min(1).default(5),
  LOGIN_COOLDOWN_MINUTES: Joi.number().integer().min(1).default(15),
  MAX_OTP_ATTEMPTS: Joi.number().integer().min(1).default(5),
  OTP_TTL_MINUTES: Joi.number().integer().min(1).default(15),
  SMTP_HOST: Joi.string().optional().allow(''),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),
  MAIL_FROM: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional().allow(''),
  GOOGLE_OAUTH_SUCCESS_REDIRECT: Joi.string().uri().optional().allow(''),
  OAUTH_EXCHANGE_CODE_TTL_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(3600)
    .default(600),
  ACCESS_TOKEN_COOKIE_NAME: Joi.string()
    .min(1)
    .max(64)
    .default('ml_access_token'),

  REDIS_URL: Joi.string().uri().optional().allow(''),
  REDIS_KEY_PREFIX: Joi.string().optional().allow(''),

  ML_SERVICE_URL: Joi.string().uri().optional().allow(''),
  ML_SERVICE_API_KEY: Joi.string().optional().allow(''),
  ML_SERVICE_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(120000)
    .default(30000),
  ML_SERVICE_MAX_RETRIES: Joi.number().integer().min(0).max(5).default(2),
  ML_PREDICT_PATH: Joi.string().default('/predict'),
  ML_SERVICE_MOCK: Joi.string()
    .valid('true', 'false', '1', '0')
    .optional()
    .allow(''),

  MARKET_DATA_PROVIDER: Joi.string()
    .valid('alpha-vantage', 'finnhub', 'yahoo')
    .default('alpha-vantage'),
  ALPHA_VANTAGE_API_KEY: Joi.string().optional().allow(''),
  FINNHUB_API_KEY: Joi.string().optional().allow(''),
  MARKET_SEARCH_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .min(30)
    .max(86400)
    .default(300),
  MARKET_OVERVIEW_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .min(15)
    .max(3600)
    .default(60),
  MARKET_WARM_SYMBOLS: Joi.string().optional().allow(''),
  MARKET_CACHE_REFRESH_CRON: Joi.string().optional().allow(''),
  MARKET_HISTORY_DAYS: Joi.number().integer().min(10).max(365).default(60),
  MARKET_HISTORY_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .min(300)
    .max(86400)
    .default(3600),
  ML_PREDICTION_CACHE_TTL_SECONDS: Joi.number()
    .integer()
    .min(60)
    .max(3600)
    .default(300),
  ML_MIN_BUY_CONFIDENCE: Joi.number().min(0).max(1).default(0.6),
  ML_MIN_AVOID_CONFIDENCE: Joi.number().min(0).max(1).default(0.55),
  COMPLIANCE_VOLATILITY_WARNING_PCT: Joi.number().min(0).max(100).default(5),
  COMPLIANCE_INFORMATIONAL_CONFIDENCE_MAX: Joi.number()
    .min(0)
    .max(1)
    .default(0.5),
  COMPLIANCE_AUDIT_RETENTION_DAYS: Joi.number()
    .integer()
    .min(30)
    .max(3650)
    .default(365),
  COMPLIANCE_AUDIT_HISTORY_LIMIT: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
});
