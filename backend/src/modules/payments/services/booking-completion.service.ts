import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BookingStatus } from '../../bookings/bookings.enums.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { PayoutsService } from './payouts.service.js';

const EVERY_FIVE_MINUTES = 5 * 60_000;
const BATCH_SIZE = 100;

@Injectable()
export class BookingCompletionService {
  private readonly logger = new Logger(BookingCompletionService.name);

  constructor(
    private readonly bookings: BookingsRepository,
    private readonly payouts: PayoutsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Interval('booking-completion', EVERY_FIVE_MINUTES)
  async run(): Promise<void> {
    try {
      await this.completeFinished(new Date());
    } catch (error) {
      this.logger.error(
        'Booking completion failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async completeFinished(now: Date): Promise<number> {
    const ids = await this.bookings.findFinishedConfirmedIds(now, BATCH_SIZE);
    let completed = 0;
    for (const id of ids) {
      await this.dataSource.transaction(async (manager) => {
        const booking = await this.bookings.findForUpdate(id, manager);
        if (booking?.status !== BookingStatus.CONFIRMED) return;
        booking.status = BookingStatus.COMPLETED;
        await this.bookings.save(booking, manager);
        await this.payouts.createForBooking(booking, manager);
        completed++;
      });
    }
    if (completed > 0) this.logger.log(`${completed} bookings completed`);
    return completed;
  }
}
