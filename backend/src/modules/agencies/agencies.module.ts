import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAgenciesController } from './controllers/admin-agencies.controller.js';
import { AgencyProfileController } from './controllers/agency-profile.controller.js';
import { AgencyDocument } from './entities/agency-document.entity.js';
import { Agency } from './entities/agency.entity.js';
import { AgenciesRepository } from './repositories/agencies.repository.js';
import { AgencyProfilesService } from './services/agency-profiles.service.js';
import { AgencyVerificationService } from './services/agency-verification.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Agency, AgencyDocument])],
  controllers: [AgencyProfileController, AdminAgenciesController],
  providers: [
    AgenciesRepository,
    AgencyProfilesService,
    AgencyVerificationService,
  ],
  exports: [AgenciesRepository, AgencyProfilesService],
})
export class AgenciesModule {}
