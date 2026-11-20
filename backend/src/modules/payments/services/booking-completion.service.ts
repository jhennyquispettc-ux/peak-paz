import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BookingSource,
  BookingStatus,
  DisputeParty,
  DisputeReason,
} from '../../bookings/bookings.enums.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { DisputesRepository } from '../../bookings/repositories/disputes.repository.js';
import {
  CompletionOutcome,
  completionOutcome,
} from '../../bookings/tour-checks.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { PayoutsService } from './payouts.service.js';

const EVERY_FIVE_MINUTES = 5 * 60_000;
const BATCH_SIZE = 100;
const MS_PER_HOUR = 60 * 60_000;
const RUNNING = new Set([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]);

export interface CompletionSummary {
  completed: number;
  disputed: number;
}

@Injectable()
export class BookingCompletionService {
  private readonly logger = new Logger(BookingCompletionService.name);

  constructor(
    private readonly bookings: BookingsRepository,
    private readonly disputes: DisputesRepository,
    private readonly payouts: PayoutsService,
    private readonly settings: SettingsService,
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

  async completeFinished(now: Date): Promise<CompletionSummary> {
    const graceHours = await this.settings.getNumber(
      SettingKey.START_CONFIRM_GRACE_HOURS,
    );
    const guideCutoff = new Date(now.getTime() - graceHours * MS_PER_HOUR);
    const ids = await this.bookings.findFinishedIds(
      now,
      guideCutoff,
      BATCH_SIZE,
    );
    const summary: CompletionSummary = { completed: 0, disputed: 0 };
    for (const id of ids) {
      await this.dataSource.transaction(async (manager) => {
        const booking = await this.bookings.findForUpdate(id, manager);
        if (!booking || !RUNNING.has(booking.status)) return;
        if (await this.disputes.existsForBooking(booking.id, manager)) return;

        const outcome = booking.guideProfileId
          ? completionOutcome(booking.guideStartedAt, booking.touristStartedAt)
          : CompletionOutcome.COMPLETE;
        if (outcome === CompletionOutcome.DISPUTE) {
          await this.disputes.create(
            {
              bookingId: booking.id,
              reason: DisputeReason.START_MISMATCH,
              openedBy: DisputeParty.SYSTEM,
              description: null,
            },
            manager,
          );
          summary.disputed++;
          return;
        }

        booking.status = BookingStatus.COMPLETED;
        await this.bookings.save(booking, manager);
        if (booking.source === BookingSource.WEB) {
          await this.payouts.createForBooking(booking, manager);
        }
        summary.completed++;
      });
    }
    if (summary.completed > 0 || summary.disputed > 0) {
      this.logger.log(
        `${summary.completed} bookings completed, ${summary.disputed} sent to dispute`,
      );
    }
    return summary;
  }
}
