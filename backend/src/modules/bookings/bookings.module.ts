import { ReschedulesController } from './controllers/reschedules.controller.js';
import { ReschedulesRepository } from './repositories/reschedules.repository.js';
import { ReschedulesService } from './services/reschedules.service.js';
import { TourChecksController } from './controllers/tour-checks.controller.js';
import { Dispute } from './entities/dispute.entity.js';
import { DisputesRepository } from './repositories/disputes.repository.js';
import { TourChecksService } from './services/tour-checks.service.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupDeparture } from '../group-departures/entities/group-departure.entity.js';
import { GuidesModule } from '../guides/guides.module.js';
import { RoutesModule } from '../routes/routes.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { AdminBookingsController } from './controllers/admin-bookings.controller.js';
import { GuideAgendaController } from './controllers/guide-agenda.controller.js';
import { BookingsController } from './controllers/bookings.controller.js';
import { GuideBookingsController } from './controllers/guide-bookings.controller.js';
import { Booking } from './entities/booking.entity.js';
import { Reschedule } from './entities/reschedule.entity.js';
import { BookingsRepository } from './repositories/bookings.repository.js';
import { AdminBookingsService } from './services/admin-bookings.service.js';
import { BookingExpirationService } from './services/booking-expiration.service.js';
import { BookingRequestsService } from './services/booking-requests.service.js';
import { GuideAgendaService } from './services/guide-agenda.service.js';
import { GuideBookingsService } from './services/guide-bookings.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Reschedule, GroupDeparture, Dispute]),
    GuidesModule,
    RoutesModule,
    SettingsModule,
  ],
  controllers: [
    BookingsController,
    GuideBookingsController,
    GuideAgendaController,
    AdminBookingsController,
    TourChecksController,
    ReschedulesController,
  ],
  providers: [
    BookingsRepository,
    AdminBookingsService,
    BookingRequestsService,
    GuideBookingsService,
    BookingExpirationService,
    GuideAgendaService,
    DisputesRepository,
    TourChecksService,
    ReschedulesRepository,
    ReschedulesService,
  ],
  exports: [BookingsRepository, DisputesRepository, ReschedulesService],
})
export class BookingsModule {}
