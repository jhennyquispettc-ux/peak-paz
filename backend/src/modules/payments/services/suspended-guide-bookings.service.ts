import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { bookingStartsAt } from '../../bookings/booking-schedule.js';
import { BookingStatus } from '../../bookings/bookings.enums.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { RefundReason } from '../payments.enums.js';
import { BookingCancellationService } from './booking-cancellation.service.js';

const EVERY_FIVE_MINUTES = 5 * 60_000;
const BATCH_SIZE = 100;
const OPEN_STATUSES = new Set([
  BookingStatus.REQUESTED,
  BookingStatus.ACCEPTED,
  BookingStatus.CONFIRMED,
]);
const REASON = 'El guía fue suspendido por la plataforma';

@Injectable()
export class SuspendedGuideBookingsService {
  private readonly logger = new Logger(SuspendedGuideBookingsService.name);

  constructor(
    private readonly bookings: BookingsRepository,
    private readonly cancellations: BookingCancellationService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Interval('suspended-guide-bookings', EVERY_FIVE_MINUTES)
  async run(): Promise<void> {
    try {
      await this.cancelOpenBookings(new Date());
    } catch (error) {
      this.logger.error(
        'Cancelling bookings of suspended guides failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async cancelOpenBookings(now: Date): Promise<number> {
    const ids = await this.bookings.findOpenOfSuspendedGuidesIds(
      now,
      BATCH_SIZE,
    );
    let cancelled = 0;
    for (const id of ids) {
      await this.dataSource.transaction(async (manager) => {
        await this.bookings.findForUpdate(id, manager);
        const booking = await this.bookings.findDetailById(id, manager);
        if (!booking || !OPEN_STATUSES.has(booking.status)) return;
        if (bookingStartsAt(booking) <= now) return;
        await this.cancellations.cancelForProvider(
          booking,
          BookingStatus.CANCELLED_BY_PROVIDER,
          RefundReason.PROVIDER_CANCELLATION,
          REASON,
          now,
          manager,
        );
        cancelled++;
      });
    }
    if (cancelled > 0) {
      this.logger.log(`${cancelled} bookings of suspended guides cancelled`);
    }
    return cancelled;
  }
}
