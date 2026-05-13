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
});
