import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { BookingsRepository } from '../repositories/bookings.repository.js';

const EVERY_MINUTE = 60_000;

@Injectable()
export class BookingExpirationService {
  private readonly logger = new Logger(BookingExpirationService.name);

  constructor(private readonly bookings: BookingsRepository) {}

  @Interval('booking-expiration', EVERY_MINUTE)
  async run(): Promise<void> {
    try {
      await this.expireOverdue(new Date());
    } catch (error) {
      this.logger.error(
        'Booking expiration failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async expireOverdue(now: Date): Promise<number> {
    const expired = await this.bookings.expireOverdue(now);
    if (expired > 0) this.logger.log(`${expired} bookings expired`);
    return expired;
  }
}
