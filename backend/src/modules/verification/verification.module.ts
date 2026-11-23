import { Global, Module } from '@nestjs/common';
import { OutboxModule, OutboxStorage } from '@nestjs/outbox';
import { fromTypeOrm, PostgresOutboxStore } from '@nestjs/outbox/postgres';
import { DataSource } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule } from '../messaging/messaging.module.js';
import { CredentialReview } from './entities/credential-review.entity.js';
import { EmailVerification } from './entities/email-verification.entity.js';
import { VerificationRepository } from './verification.repository.js';
import { AccountVerificationController } from './verification.controller.js';
import { AccountVerificationService } from './verification.service.js';

@Global()
@Module({
  imports: [
    OutboxModule.forRoot({ relay: { pollInterval: '1s' } }),
    TypeOrmModule.forFeature([EmailVerification, CredentialReview]),
    MessagingModule,
  ],
  providers: [
    VerificationRepository,
    AccountVerificationService,
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
  controllers: [AccountVerificationController],
  exports: [AccountVerificationService],
})
export class VerificationModule {}
