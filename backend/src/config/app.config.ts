import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment } from '../common/enums/environment.enum.js';

@Injectable()
export class AppConfig {
  readonly nodeEnv: Environment;
  readonly port: number;
  readonly apiPrefix: string;
  readonly isProduction: boolean;
  readonly db: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    logging: boolean;
  };
  readonly jwt: {
    secret: string;
    expiresIn: string;
  };
  readonly weather: {
    apiUrl: string;
    timeoutMs: number;
    cacheMinutes: number;
  };
  readonly storage: {
    driver: 'local' | 'cloudinary';
    localDir: string;
    cloudinary: {
      cloudName: string;
      apiKey: string;
      apiSecret: string;
    };
  };
  readonly mail: {
    transport: 'smtp' | 'file';
    smtpUrl: string;
    from: string;
    directory: string;
    publicWebUrl: string;
  };
  readonly payments: {
    driver: 'fake' | 'paypal';
    returnUrl: string;
    cancelUrl: string;
    termsVersion: string;
    paypal: {
      baseUrl: string;
      clientId: string;
      clientSecret: string;
    };
  };

  constructor(config: ConfigService) {
    this.nodeEnv = config.getOrThrow<Environment>('NODE_ENV');
    this.port = config.getOrThrow<number>('PORT');
    this.apiPrefix = config.getOrThrow<string>('API_PREFIX');
    this.isProduction = this.nodeEnv === Environment.PRODUCTION;
    this.db = {
      host: config.getOrThrow<string>('DB_HOST'),
      port: config.getOrThrow<number>('DB_PORT'),
      user: config.getOrThrow<string>('DB_USER'),
      password: config.getOrThrow<string>('DB_PASSWORD'),
      name: config.getOrThrow<string>('DB_NAME'),
      logging: config.getOrThrow<boolean>('DB_LOGS'),
    };
    this.jwt = {
      secret: config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: config.getOrThrow<string>('JWT_EXPIRES_IN'),
    };
    this.weather = {
      apiUrl: config.getOrThrow<string>('WEATHER_API_URL'),
      timeoutMs: config.getOrThrow<number>('WEATHER_TIMEOUT_MS'),
      cacheMinutes: config.getOrThrow<number>('WEATHER_CACHE_MINUTES'),
    };
    this.storage = {
      driver: config.getOrThrow<'local' | 'cloudinary'>('STORAGE_DRIVER'),
      localDir: config.getOrThrow<string>('STORAGE_LOCAL_DIR'),
      cloudinary: {
        cloudName: config.get<string>('CLOUDINARY_CLOUD_NAME') ?? '',
        apiKey: config.get<string>('CLOUDINARY_API_KEY') ?? '',
        apiSecret: config.get<string>('CLOUDINARY_API_SECRET') ?? '',
      },
    };
    this.mail = {
      transport: config.getOrThrow<'smtp' | 'file'>('MAIL_TRANSPORT'),
      smtpUrl: config.getOrThrow<string>('SMTP_URL'),
      from: config.getOrThrow<string>('MAIL_FROM'),
      directory: config.getOrThrow<string>('MAIL_DIRECTORY'),
      publicWebUrl: config.getOrThrow<string>('PUBLIC_WEB_URL'),
    };
    this.payments = {
      driver: config.getOrThrow<'fake' | 'paypal'>('PAYMENT_DRIVER'),
      returnUrl: config.getOrThrow<string>('PAYMENT_RETURN_URL'),
      cancelUrl: config.getOrThrow<string>('PAYMENT_CANCEL_URL'),
      termsVersion: config.getOrThrow<string>('TERMS_VERSION'),
      paypal: {
        baseUrl: config.getOrThrow<string>('PAYPAL_BASE_URL'),
        clientId: config.get<string>('PAYPAL_CLIENT_ID') ?? '',
        clientSecret: config.get<string>('PAYPAL_CLIENT_SECRET') ?? '',
      },
    };
  }
}
