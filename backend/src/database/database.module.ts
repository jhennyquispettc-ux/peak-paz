import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../config/app.config.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        type: 'postgres',
        host: config.db.host,
        port: config.db.port,
        username: config.db.user,
        password: config.db.password,
        database: config.db.name,
        autoLoadEntities: true,
        migrations: [join(import.meta.dirname, 'migrations', '*.js')],
        migrationsRun: true,
        uuidExtension: 'pgcrypto',
        synchronize: false,
        logging: config.db.logging,
      }),
    }),
  ],
})
export class DatabaseModule {}
