import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(4000),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
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
});
