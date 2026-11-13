import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgenciesModule } from '../agencies/agencies.module.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { RoutesModule } from '../routes/routes.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { AgencyDeparturesController } from './controllers/agency-departures.controller.js';
import { DeparturesController } from './controllers/departures.controller.js';
import { GroupDeparture } from './entities/group-departure.entity.js';
import { GroupDeparturesRepository } from './repositories/group-departures.repository.js';
import { AgencyDeparturesService } from './services/agency-departures.service.js';
import { DeparturesService } from './services/departures.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupDeparture, Booking]),
    AgenciesModule,
    BookingsModule,
    RoutesModule,
    SettingsModule,
  ],
  controllers: [DeparturesController, AgencyDeparturesController],
  providers: [
    GroupDeparturesRepository,
    AgencyDeparturesService,
    DeparturesService,
  ],
  exports: [GroupDeparturesRepository, AgencyDeparturesService],
})
export class GroupDeparturesModule {}
