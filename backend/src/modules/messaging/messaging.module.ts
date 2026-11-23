import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller.js';
import { MessagingService } from './messaging.service.js';
import { WorkerWakeService } from './worker-wake.service.js';

@Module({
  controllers: [MessagingController],
  providers: [MessagingService, WorkerWakeService],
  exports: [MessagingService],
})
export class MessagingModule {}
