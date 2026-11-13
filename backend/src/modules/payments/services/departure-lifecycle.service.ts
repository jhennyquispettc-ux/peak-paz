import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { laPazInstant } from '../../../common/time/la-paz-time.js';
import { todayInLaPaz } from '../../../common/verification/verification-documents.js';
import { BookingStatus } from '../../bookings/bookings.enums.js';
import { InvalidBookingStatusException } from '../../bookings/exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { AgencyDepartureDto } from '../../group-departures/dto/departure.dto.js';
import { GroupDeparture } from '../../group-departures/entities/group-departure.entity.js';
import { DepartureNotFoundException } from '../../group-departures/exceptions/group-departures.exceptions.js';
import { GroupDepartureStatus } from '../../group-departures/group-departures.enums.js';
import { GroupDeparturesRepository } from '../../group-departures/repositories/group-departures.repository.js';
import { AgencyDeparturesService } from '../../group-departures/services/agency-departures.service.js';
import { TourAlreadyStartedException } from '../exceptions/payments.exceptions.js';
import { RefundReason } from '../payments.enums.js';
import { BookingCancellationService } from './booking-cancellation.service.js';

const EVERY_FIVE_MINUTES = 5 * 60_000;
const MINIMUM_REASON =
  'The departure did not reach the minimum number of people.';
const OPEN_BOOKING_STATUSES = new Set([
  BookingStatus.ACCEPTED,
  BookingStatus.CONFIRMED,
]);

export interface ClosingSummary {
  confirmed: number;
  cancelled: number;
}

@Injectable()
export class DepartureLifecycleService {
  private readonly logger = new Logger(DepartureLifecycleService.name);

  constructor(
    private readonly departures: GroupDeparturesRepository,
    private readonly agencyDepartures: AgencyDeparturesService,
    private readonly bookings: BookingsRepository,
    private readonly cancellations: BookingCancellationService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Interval('departure-lifecycle', EVERY_FIVE_MINUTES)
  async run(): Promise<void> {
    try {
      await this.closeDue(new Date());
      await this.departures.completeFinished(todayInLaPaz());
    } catch (error) {
      this.logger.error(
        'Departure lifecycle failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async closeDue(now: Date): Promise<ClosingSummary> {
    const summary: ClosingSummary = { confirmed: 0, cancelled: 0 };
    for (const { id } of await this.departures.findDueToClose(now)) {
      await this.dataSource.transaction(async (manager) => {
        const departure = await this.departures.lockById(id, manager);
        if (departure?.status !== GroupDepartureStatus.PUBLISHED) return;

        const bookings = await this.departures.findBookings(id, manager);
        for (const booking of bookings) {
          if (booking.status === BookingStatus.ACCEPTED) {
            booking.status = BookingStatus.EXPIRED;
            await this.bookings.save(booking, manager);
          }
        }
        const confirmedSeats = bookings
          .filter((booking) => booking.status === BookingStatus.CONFIRMED)
          .reduce((total, booking) => total + booking.peopleCount, 0);

        if (confirmedSeats >= departure.minPeople) {
          departure.status = GroupDepartureStatus.CONFIRMED;
          await this.departures.save(departure, manager);
          summary.confirmed++;
          return;
        }
        await this.cancelAll(
          departure,
          GroupDepartureStatus.CANCELLED_MIN_NOT_REACHED,
          BookingStatus.CANCELLED_BY_PROVIDER,
          RefundReason.MINIMUM_NOT_REACHED,
          MINIMUM_REASON,
          now,
          manager,
        );
        summary.cancelled++;
      });
    }
    if (summary.confirmed + summary.cancelled > 0) {
      this.logger.log(
        `Departures closed: ${summary.confirmed} confirmed, ${summary.cancelled} cancelled`,
      );
    }
    return summary;
  }

  async cancelByAgency(
    userId: string,
    id: string,
    reason: string,
    weather: boolean,
  ): Promise<AgencyDepartureDto> {
    const owned = await this.agencyDepartures.findMine(userId, id);

    await this.dataSource.transaction(async (manager) => {
      const departure = await this.departures.lockById(owned.id, manager);
      if (!departure) throw new DepartureNotFoundException();
      const cancellable = [
        GroupDepartureStatus.PUBLISHED,
        GroupDepartureStatus.CONFIRMED,
      ];
      if (!cancellable.includes(departure.status)) {
        throw new InvalidBookingStatusException(departure.status);
      }
      const now = new Date();
      if (laPazInstant(departure.departureDate, departure.meetingTime) <= now) {
        throw new TourAlreadyStartedException();
      }
      await this.cancelAll(
        departure,
        weather
          ? GroupDepartureStatus.CANCELLED_WEATHER
          : GroupDepartureStatus.CANCELLED_BY_AGENCY,
        weather
          ? BookingStatus.CANCELLED_WEATHER
          : BookingStatus.CANCELLED_BY_PROVIDER,
        weather ? RefundReason.WEATHER : RefundReason.PROVIDER_CANCELLATION,
        reason,
        now,
        manager,
      );
    });
    return this.agencyDepartures.getMine(userId, id);
  }

  private async cancelAll(
    departure: GroupDeparture,
    departureStatus: GroupDepartureStatus,
    bookingStatus: BookingStatus,
    refundReason: RefundReason,
    reason: string,
    now: Date,
    manager: EntityManager,
  ): Promise<void> {
    const bookings = await this.departures.findBookings(departure.id, manager);
    for (const booking of bookings) {
      if (!OPEN_BOOKING_STATUSES.has(booking.status)) continue;
      await this.cancellations.cancelForProvider(
        booking,
        bookingStatus,
        refundReason,
        reason,
        now,
        manager,
      );
    }
    departure.status = departureStatus;
    await this.departures.save(departure, manager);
  }
}
