import { NotificationsService } from '../../notifications/services/notifications.service.js';
import { NotificationType } from '../../notifications/notifications.enums.js';
import { bookingNotice } from '../../notifications/booking-notice.js';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { addMinutes, laPazInstant } from '../../../common/time/la-paz-time.js';
import { GuideNotFoundException } from '../../guides/exceptions/guides.exceptions.js';
import {
  busyWindow,
  GuidesRepository,
} from '../../guides/repositories/guides.repository.js';
import { TourIntervalService } from '../../routes/services/tour-interval.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { bookingStartsAt } from '../booking-schedule.js';
import { BookingStatus, RescheduleResponse } from '../bookings.enums.js';
import { BookingDto } from '../dto/booking.dto.js';
import { ProposeRescheduleDto, RescheduleDto } from '../dto/reschedule.dto.js';
import { Booking } from '../entities/booking.entity.js';
import { Reschedule } from '../entities/reschedule.entity.js';
import {
  BookingNotFoundException,
  GuideNotAvailableException,
  InsufficientAdvanceException,
  InvalidBookingStatusException,
  RescheduleAlreadyPendingException,
  RescheduleClosedException,
  RescheduleNotFoundException,
  RescheduleTooLateException,
  SameDateException,
} from '../exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../repositories/bookings.repository.js';
import { ReschedulesRepository } from '../repositories/reschedules.repository.js';
import { canStillAnswer, rescheduleRespondBy } from '../reschedule-rules.js';

const EVERY_FIVE_MINUTES = 5 * 60_000;

@Injectable()
export class ReschedulesService {
  private readonly logger = new Logger(ReschedulesService.name);

  constructor(
    private readonly bookings: BookingsRepository,
    private readonly reschedules: ReschedulesRepository,
    private readonly guides: GuidesRepository,
    private readonly tourIntervals: TourIntervalService,
    private readonly settings: SettingsService,
    private readonly notices: NotificationsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Interval('reschedule-expiry', EVERY_FIVE_MINUTES)
  async run(): Promise<void> {
    try {
      const expired = await this.reschedules.expireDue(new Date());
      if (expired > 0) this.logger.log(`${expired} date changes expired`);
    } catch (error) {
      this.logger.error(
        'Date change expiry failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  expireDue(now: Date): Promise<number> {
    return this.reschedules.expireDue(now);
  }

  async propose(
    userId: string,
    bookingId: string,
    dto: ProposeRescheduleDto,
  ): Promise<RescheduleDto> {
    const guideProfileId = await this.profileIdOf(userId);
    const [deadlineHours, advanceHours] = await Promise.all([
      this.settings.getNumber(SettingKey.RESCHEDULE_DEADLINE_HOURS),
      this.settings.getNumber(SettingKey.MIN_ADVANCE_HOURS),
    ]);

    const id = await this.dataSource.transaction(async (manager) => {
      await this.guides.lockById(guideProfileId, manager);
      const booking = await this.lockedBooking(bookingId, manager);
      if (booking.guideProfileId !== guideProfileId) {
        throw new BookingNotFoundException();
      }
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new InvalidBookingStatusException(booking.status);
      }
      if (booking.tourDate === dto.newDate) throw new SameDateException();
      if (await this.reschedules.hasPending(booking.id, manager)) {
        throw new RescheduleAlreadyPendingException();
      }

      const now = new Date();
      const newStart = laPazInstant(dto.newDate, booking.startTime!);
      if (newStart < addMinutes(now, advanceHours * 60)) {
        throw new InsufficientAdvanceException(advanceHours);
      }
      const respondBy = rescheduleRespondBy(
        bookingStartsAt(booking),
        newStart,
        deadlineHours,
      );
      if (!canStillAnswer(now, respondBy)) {
        throw new RescheduleTooLateException(deadlineHours);
      }
      await this.assertGuideFree(booking, dto.newDate, manager);

      const reschedule = await this.reschedules.create(
        {
          bookingId: booking.id,
          previousDate: booking.tourDate!,
          newDate: dto.newDate,
          reason: dto.reason,
          respondBy,
        },
        manager,
      );
      await this.notices.notify(
        manager,
        booking.touristId,
        NotificationType.RESCHEDULE_PROPOSED,
        bookingNotice(booking, {
          newDate: dto.newDate,
          reason: dto.reason,
          respondBy: respondBy.toISOString().slice(0, 16).replace('T', ' '),
        }),
      );
      return reschedule.id;
    });
    return this.findDto(bookingId, id);
  }

  async accept(
    touristId: string,
    bookingId: string,
    rescheduleId: string,
  ): Promise<BookingDto> {
    await this.dataSource.transaction(async (manager) => {
      const booking = await this.lockedBooking(bookingId, manager);
      if (booking.touristId !== touristId) throw new BookingNotFoundException();
      const reschedule = await this.openReschedule(
        rescheduleId,
        booking,
        manager,
      );
      await this.guides.lockById(booking.guideProfileId!, manager);
      const interval = await this.assertGuideFree(
        booking,
        reschedule.newDate,
        manager,
      );

      booking.tourDate = reschedule.newDate;
      booking.endsAt = interval.endsAt;
      booking.reconfirmedAt = null;
      await this.bookings.save(booking, manager);

      reschedule.response = RescheduleResponse.ACCEPTED;
      reschedule.respondedAt = new Date();
      await this.reschedules.save(reschedule, manager);
      await this.notices.notify(
        manager,
        booking.guideProfile?.userId,
        NotificationType.RESCHEDULE_ANSWERED,
        bookingNotice(booking, {
          answer: 'RESCHEDULE_ACCEPTED',
          newDate: reschedule.newDate,
        }),
      );
    });
    const booking = await this.bookings.findDetailById(bookingId);
    return BookingDto.fromEntity(booking!);
  }

  async openReschedule(
    rescheduleId: string,
    booking: Booking,
    manager: EntityManager,
  ): Promise<Reschedule> {
    const reschedule = await this.reschedules.findForBooking(
      rescheduleId,
      booking.id,
      manager,
    );
    if (!reschedule) throw new RescheduleNotFoundException();
    if (
      reschedule.response !== RescheduleResponse.PENDING ||
      !canStillAnswer(new Date(), reschedule.respondBy)
    ) {
      throw new RescheduleClosedException();
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new InvalidBookingStatusException(booking.status);
    }
    return reschedule;
  }

  async markRejected(
    reschedule: Reschedule,
    booking: Booking,
    now: Date,
    manager: EntityManager,
  ): Promise<void> {
    reschedule.response = RescheduleResponse.REJECTED;
    reschedule.respondedAt = now;
    await this.reschedules.save(reschedule, manager);
    await this.notices.notify(
      manager,
      booking.guideProfile?.userId,
      NotificationType.RESCHEDULE_ANSWERED,
      bookingNotice(booking, {
        answer: 'RESCHEDULE_REJECTED',
        newDate: reschedule.newDate,
      }),
    );
  }

  async listForTourist(
    touristId: string,
    bookingId: string,
  ): Promise<RescheduleDto[]> {
    const booking = await this.bookings.findDetailById(bookingId);
    if (!booking || booking.touristId !== touristId) {
      throw new BookingNotFoundException();
    }
    return this.list(bookingId);
  }

  async listForGuide(
    userId: string,
    bookingId: string,
  ): Promise<RescheduleDto[]> {
    const guideProfileId = await this.profileIdOf(userId);
    const booking = await this.bookings.findDetailById(bookingId);
    if (!booking || booking.guideProfileId !== guideProfileId) {
      throw new BookingNotFoundException();
    }
    return this.list(bookingId);
  }

  private async list(bookingId: string): Promise<RescheduleDto[]> {
    const reschedules = await this.reschedules.listForBooking(bookingId);
    return reschedules.map((reschedule) =>
      RescheduleDto.fromEntity(reschedule),
    );
  }

  private async findDto(bookingId: string, id: string): Promise<RescheduleDto> {
    const all = await this.reschedules.listForBooking(bookingId);
    return RescheduleDto.fromEntity(all.find((item) => item.id === id)!);
  }

  private async assertGuideFree(
    booking: Booking,
    newDate: string,
    manager: EntityManager,
  ) {
    const interval = await this.tourIntervals.forTour(
      booking.route!,
      newDate,
      booking.startTime!,
    );
    const buffer = await this.settings.getNumber(
      SettingKey.SCHEDULE_BUFFER_MIN,
    );
    const window = busyWindow(interval, buffer);
    const busy = await this.guides.isBusy(
      booking.guideProfileId!,
      window.busyFrom,
      window.busyUntil,
      booking.id,
      manager,
    );
    if (busy) throw new GuideNotAvailableException();
    return interval;
  }

  private async lockedBooking(
    bookingId: string,
    manager: EntityManager,
  ): Promise<Booking> {
    await this.bookings.findForUpdate(bookingId, manager);
    const booking = await this.bookings.findDetailById(bookingId, manager);
    if (!booking || !booking.guideProfileId) {
      throw new BookingNotFoundException();
    }
    return booking;
  }

  private async profileIdOf(userId: string): Promise<string> {
    const profile = await this.guides.findIdByUserId(userId);
    if (!profile) throw new GuideNotFoundException();
    return profile.id;
  }
}
