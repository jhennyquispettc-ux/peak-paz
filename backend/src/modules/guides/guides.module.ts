import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesModule } from '../routes/routes.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { AdminGuidesController } from './controllers/admin-guides.controller.js';
import { GuideAvailabilityController } from './controllers/guide-availability.controller.js';
import { GuideProfileController } from './controllers/guide-profile.controller.js';
import { PublicGuidesController } from './controllers/public-guides.controller.js';
import { GuideAvailability } from './entities/guide-availability.entity.js';
import { GuideAvailableDate } from './entities/guide-available-date.entity.js';
import { GuideCommitment } from './entities/guide-commitment.entity.js';
import { GuideDocument } from './entities/guide-document.entity.js';
import { GuideProfile } from './entities/guide-profile.entity.js';
import { GuideRoute } from './entities/guide-route.entity.js';
import { GuidesRepository } from './repositories/guides.repository.js';
import { GuideAvailabilityService } from './services/guide-availability.service.js';
import { GuideProfilesService } from './services/guide-profiles.service.js';
import { GuideVerificationService } from './services/guide-verification.service.js';
import { PublicGuidesService } from './services/public-guides.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GuideProfile,
      GuideDocument,
      GuideRoute,
      GuideAvailability,
      GuideAvailableDate,
      GuideCommitment,
    ]),
    RoutesModule,
    SettingsModule,
  ],
  controllers: [
    GuideProfileController,
    GuideAvailabilityController,
    AdminGuidesController,
    PublicGuidesController,
  ],
  providers: [
    GuidesRepository,
    GuideProfilesService,
    GuideVerificationService,
    GuideAvailabilityService,
    PublicGuidesService,
  ],
  exports: [GuidesRepository, GuideProfilesService, GuideAvailabilityService],
})
export class GuidesModule {}
