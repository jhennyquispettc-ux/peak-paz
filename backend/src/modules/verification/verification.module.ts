import { Global, Module } from '@nestjs/common';
import { OutboxModule, OutboxStorage } from '@nestjs/outbox';
import { fromTypeOrm, PostgresOutboxStore } from '@nestjs/outbox/postgres';
import { DataSource } from 'typeorm';
import { VerificationClient } from './verification.client.js';
import { AccountVerificationController } from './verification.controller.js';
import { AccountVerificationService } from './verification.service.js';

@Global()
@Module({
  imports: [OutboxModule.forRoot({ relay: { pollInterval: '1s' } })],
  providers: [
    VerificationClient,
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
