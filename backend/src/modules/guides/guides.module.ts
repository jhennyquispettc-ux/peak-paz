import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesModule } from '../routes/routes.module.js';
import { AdminGuidesController } from './controllers/admin-guides.controller.js';
import { GuideProfileController } from './controllers/guide-profile.controller.js';
import { GuideAvailability } from './entities/guide-availability.entity.js';
import { GuideBlockedDate } from './entities/guide-blocked-date.entity.js';
import { GuideDocument } from './entities/guide-document.entity.js';
import { GuideProfile } from './entities/guide-profile.entity.js';
import { GuideRoute } from './entities/guide-route.entity.js';
import { GuidesRepository } from './repositories/guides.repository.js';
import { GuideProfilesService } from './services/guide-profiles.service.js';
import { GuideVerificationService } from './services/guide-verification.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GuideProfile,
      GuideDocument,
      GuideRoute,
      GuideAvailability,
      GuideBlockedDate,
    ]),
    RoutesModule,
  ],
  controllers: [GuideProfileController, AdminGuidesController],
  providers: [GuidesRepository, GuideProfilesService, GuideVerificationService],
  exports: [GuidesRepository, GuideProfilesService],
})
export class GuidesModule {}
