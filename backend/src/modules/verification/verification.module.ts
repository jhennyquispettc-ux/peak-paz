import { Global, Module } from '@nestjs/common';
import { OutboxModule, OutboxStorage } from '@nestjs/outbox';
import { fromTypeOrm, PostgresOutboxStore } from '@nestjs/outbox/postgres';
import { DataSource } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule } from '../messaging/messaging.module.js';
import { DocumentReviewController } from './document-review.controller.js';
import { DocumentReviewRepository } from './document-review.repository.js';
import { DocumentReviewService } from './document-review.service.js';
import { CredentialReview } from './entities/credential-review.entity.js';
import { DocumentReview } from './entities/document-review.entity.js';
import { EmailVerification } from './entities/email-verification.entity.js';
import { ProviderInterview } from './entities/provider-interview.entity.js';
import { InterviewController } from './interview.controller.js';
import { InterviewRepository } from './interview.repository.js';
import { InterviewService } from './interview.service.js';
import { VerificationRepository } from './verification.repository.js';
import { AccountVerificationController } from './verification.controller.js';
import { AccountVerificationService } from './verification.service.js';

@Global()
@Module({
  imports: [
    OutboxModule.forRoot({ relay: { pollInterval: '1s' } }),
    TypeOrmModule.forFeature([
      EmailVerification,
      CredentialReview,
      DocumentReview,
      ProviderInterview,
    ]),
    MessagingModule,
  ],
  providers: [
    VerificationRepository,
    AccountVerificationService,
    DocumentReviewRepository,
    DocumentReviewService,
    InterviewRepository,
    InterviewService,
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
  controllers: [
    AccountVerificationController,
    DocumentReviewController,
    InterviewController,
  ],
  exports: [
    AccountVerificationService,
    DocumentReviewService,
    InterviewService,
  ],
})
export class VerificationModule {}
