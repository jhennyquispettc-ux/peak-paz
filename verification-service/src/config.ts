import Joi from 'joi';

export const environment = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3020),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  VERIFICATION_SERVICE_KEY: Joi.string().min(32).required(),
  EMAIL_TOKEN_SECRET: Joi.string().min(32).required(),
  PUBLIC_WEB_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:5173'),
  EMAIL_TOKEN_MINUTES: Joi.number().integer().min(1).max(1440).default(30),
  EMAIL_RESEND_SECONDS: Joi.number().integer().min(30).default(60),
  MAIL_TRANSPORT: Joi.string().valid('smtp', 'file').default('smtp'),
  SMTP_URL: Joi.string()
    .uri({ scheme: ['smtp', 'smtps'] })
    .default('smtp://localhost:1025'),
  MAIL_FROM: Joi.string().default('Peak Paz <cuentas@peakpaz.local>'),
  MAIL_DIRECTORY: Joi.string().default('var/mail'),
});
