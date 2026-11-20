import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileMailTransport, MailModule, SmtpTransport } from '@nestjs/mail';
import { OutboxModule, OutboxStorage } from '@nestjs/outbox';
import { fromTypeOrm, PostgresOutboxStore } from '@nestjs/outbox/postgres';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { environment } from './config.js';
import { HealthController, VerificationController } from './controllers.js';
import { CredentialReview, VerificationCase } from './entities.js';
import { InternalGuard } from './internal.guard.js';
import { VerificationSchema1795200000000 } from './migration.js';
import { VerificationService } from './verification.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: environment }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: 'postgres' as const,
        host: c.getOrThrow<string>('DB_HOST'),
        port: c.getOrThrow<number>('DB_PORT'),
        username: c.getOrThrow<string>('DB_USER'),
        password: c.getOrThrow<string>('DB_PASSWORD'),
        database: c.getOrThrow<string>('DB_NAME'),
        entities: [VerificationCase, CredentialReview],
        migrations: [VerificationSchema1795200000000],
        migrationsRun: true,
        synchronize: false,
        retryAttempts: 3,
      }),
    }),
    OutboxModule.forRoot({
      relay: { pollInterval: '1s', publishTimeout: '20s', lease: '1m' },
    }),
    MailModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        from: c.getOrThrow<string>('MAIL_FROM'),
        transport:
          c.getOrThrow<string>('MAIL_TRANSPORT') === 'file'
            ? new FileMailTransport({
                directory: c.getOrThrow<string>('MAIL_DIRECTORY'),
              })
            : new SmtpTransport({
                url: c.getOrThrow<string>('SMTP_URL'),
                startTls:
                  process.env.NODE_ENV === 'production'
                    ? 'required'
                    : 'opportunistic',
              }),
      }),
    }),
  ],
  controllers: [VerificationController, HealthController],
  providers: [
    InternalGuard,
    VerificationService,
    {
      provide: PostgresOutboxStore,
      inject: [DataSource, OutboxStorage],
      useFactory: (db: DataSource, storage: OutboxStorage) =>
        new PostgresOutboxStore(
          { executor: fromTypeOrm(db), migrate: true },
          storage,
        ),
    },
  ],
})
export class AppModule {}
