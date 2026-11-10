import Joi from 'joi';
import { Environment } from '../common/enums/environment.enum.js';

export const envValidation = Joi.object({
  NODE_ENV: Joi.string()
    .valid(...Object.values(Environment))
    .default(Environment.DEVELOPMENT),
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

  SEED_ADMIN_EMAIL: Joi.string().email().required(),
  SEED_ADMIN_PASSWORD: Joi.string().min(8).required(),
  SEED_ADMIN_FIRST_NAME: Joi.string().default('Admin'),
  SEED_ADMIN_LAST_NAME: Joi.string().default('Peak Paz'),
});
