import Joi from 'joi';
import { Environment } from '../common/enums/environment.enum.js';

export const envValidation = Joi.object({
  NODE_ENV: Joi.string()
    .valid(...Object.values(Environment))
    .default(Environment.DEVELOPMENT),
  VERIFICATION_SERVICE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:3020'),
  VERIFICATION_SERVICE_KEY: Joi.string().min(32).required(),
  VERIFICATION_TIMEOUT_MS: Joi.number()
    .integer()
    .min(500)
    .max(30000)
    .default(5000),
  EMAIL_TOKEN_MINUTES: Joi.number().integer().min(1).max(1440).default(30),
  EMAIL_RESEND_SECONDS: Joi.number().integer().min(30).default(60),
  RABBITMQ_URL: Joi.string()
    .uri({ scheme: ['amqp', 'amqps'] })
    .allow('')
    .default(''),
  MAIL_TRANSPORT: Joi.string().valid('smtp', 'file').default('smtp'),
  SMTP_URL: Joi.string()
    .uri({ scheme: ['smtp', 'smtps'] })
    .default('smtp://localhost:1025'),
  MAIL_FROM: Joi.string().default('Peak Paz <avisos@peakpaz.local>'),
  MAIL_DIRECTORY: Joi.string().default('var/mail'),
  PUBLIC_WEB_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:5173'),
  PORT: Joi.number().port().default(3010),
  API_PREFIX: Joi.string().default('api'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_LOGS: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('8h'),

  WEATHER_API_URL: Joi.string()
    .uri()
    .default('https://api.open-meteo.com/v1/forecast'),
  WEATHER_TIMEOUT_MS: Joi.number().integer().min(500).default(5000),
  WEATHER_CACHE_MINUTES: Joi.number().integer().min(0).default(30),

  STORAGE_DRIVER: Joi.string().valid('local', 'cloudinary').default('local'),
  STORAGE_LOCAL_DIR: Joi.string().default('uploads'),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''),
  CLOUDINARY_API_KEY: Joi.string().allow('').default(''),
  CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),

  PAYMENT_DRIVER: Joi.string().valid('fake', 'paypal').default('fake'),
  PAYPAL_BASE_URL: Joi.string()
    .uri()
    .default('https://api-m.sandbox.paypal.com'),
  PAYPAL_CLIENT_ID: Joi.string().allow('').default(''),
  PAYPAL_CLIENT_SECRET: Joi.string().allow('').default(''),
  PAYMENT_RETURN_URL: Joi.string()
    .uri()
    .default('http://localhost:5173/pagos/confirmar'),
  PAYMENT_CANCEL_URL: Joi.string()
    .uri()
    .default('http://localhost:5173/pagos/cancelado'),
  TERMS_VERSION: Joi.string().max(20).default('1.0'),

  SEED_ADMIN_EMAIL: Joi.string().email().required(),
  SEED_ADMIN_PASSWORD: Joi.string().min(8).required(),
  SEED_ADMIN_FIRST_NAME: Joi.string().default('Admin'),
  SEED_ADMIN_LAST_NAME: Joi.string().default('Peak Paz'),
});
