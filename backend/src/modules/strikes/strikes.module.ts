import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuidesModule } from '../guides/guides.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminSanctionsController } from './controllers/admin-sanctions.controller.js';
import { GuideSanctionsController } from './controllers/guide-sanctions.controller.js';
import { CancellationReview } from './entities/cancellation-review.entity.js';
import { Strike } from './entities/strike.entity.js';
import { CancellationReviewsRepository } from './repositories/cancellation-reviews.repository.js';
import { StrikesRepository } from './repositories/strikes.repository.js';
import { CancellationReviewsService } from './services/cancellation-reviews.service.js';
import { FinesService } from './services/fines.service.js';
import { StrikeExpiryService } from './services/strike-expiry.service.js';
import { StrikePenaltiesService } from './services/strike-penalties.service.js';
import { StrikesService } from './services/strikes.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Strike, CancellationReview]),
    GuidesModule,
    UsersModule,
    SettingsModule,
  ],
  controllers: [AdminSanctionsController, GuideSanctionsController],
  providers: [
    StrikesRepository,
    CancellationReviewsRepository,
    StrikePenaltiesService,
    FinesService,
    CancellationReviewsService,
    StrikesService,
    StrikeExpiryService,
  ],
  exports: [CancellationReviewsService, FinesService],
})
export class StrikesModule {}
