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
  }
}
