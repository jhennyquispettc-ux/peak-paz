import { NotificationsService } from '../../notifications/services/notifications.service.js';
import { NotificationType } from '../../notifications/notifications.enums.js';
import { bookingNotice } from '../../notifications/booking-notice.js';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { GuideNotFoundException } from '../../guides/exceptions/guides.exceptions.js';
import { GuidesRepository } from '../../guides/repositories/guides.repository.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { bookingEndsAt, bookingStartsAt } from '../booking-schedule.js';
import {
  BookingStatus,
  DisputeParty,
  DisputeReason,
} from '../bookings.enums.js';
import { BookingDto } from '../dto/booking.dto.js';
import { DisputeDto } from '../dto/tour-check.dto.js';
import { Booking } from '../entities/booking.entity.js';
import {
  AlreadyReconfirmedException,
  AlreadyStartedException,
  BookingNotFoundException,
  DisputeAlreadyOpenException,
  InvalidBookingStatusException,
  NoShowReportTooEarlyException,
  ReconfirmationNotOpenException,
  StartWindowClosedException,
} from '../exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../repositories/bookings.repository.js';
import { DisputesRepository } from '../repositories/disputes.repository.js';
import {
  canMarkStart,
  canReconfirm,
  canReportNoShow,
  distanceMeters,
} from '../tour-checks.js';

const STARTABLE = new Set([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]);

const TEN_MINUTES = 10 * 60_000;
const BATCH_SIZE = 100;

@Injectable()
export class TourChecksService {
  private readonly logger = new Logger(TourChecksService.name);

  constructor(
    private readonly bookings: BookingsRepository,
    private readonly disputes: DisputesRepository,
    private readonly guides: GuidesRepository,
    private readonly settings: SettingsService,
    private readonly notices: NotificationsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Interval('reconfirmation-alerts', TEN_MINUTES)
  async runReconfirmationAlerts(): Promise<void> {
    try {
      await this.alertMissedReconfirmations(new Date());
    } catch (error) {
      this.logger.error(
        'Reconfirmation alerts failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async alertMissedReconfirmations(now: Date): Promise<number> {
    const deadlineHours = await this.settings.getNumber(
      SettingKey.RECONFIRM_DEADLINE_HOURS,
    );
    const ids = await this.bookings.findMissedReconfirmationIds(
      now,
      deadlineHours,
      BATCH_SIZE,
    );
    let alerted = 0;
    for (const id of ids) {
      await this.dataSource.transaction(async (manager) => {
        await this.bookings.findForUpdate(id, manager);
        const booking = await this.bookings.findDetailById(id, manager);
        if (
          !booking ||
          booking.status !== BookingStatus.CONFIRMED ||
          booking.reconfirmedAt ||
          booking.reconfirmationAlertedAt
        ) {
          return;
        }
        booking.reconfirmationAlertedAt = now;
        await this.bookings.save(booking, manager);
        await this.notices.notify(
          manager,
          booking.touristId,
          NotificationType.RECONFIRMATION_MISSED,
          bookingNotice(booking),
        );
        alerted++;
      });
    }
    return alerted;
  }

  async reconfirm(userId: string, bookingId: string): Promise<BookingDto> {
    const guideProfileId = await this.profileIdOf(userId);
    const openHours = await this.settings.getNumber(
      SettingKey.RECONFIRM_OPEN_HOURS,
    );
    await this.dataSource.transaction(async (manager) => {
      const booking = await this.guideBooking(
        bookingId,
        guideProfileId,
        manager,
      );
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new InvalidBookingStatusException(booking.status);
      }
      if (booking.reconfirmedAt) throw new AlreadyReconfirmedException();
      const now = new Date();
      if (!canReconfirm(now, bookingStartsAt(booking), openHours)) {
        throw new ReconfirmationNotOpenException();
      }
      booking.reconfirmedAt = now;
      await this.bookings.save(booking, manager);
    });
    return this.dto(bookingId, true);
  }

  async startByGuide(
    userId: string,
    bookingId: string,
    latitude: number,
    longitude: number,
  ): Promise<BookingDto> {
    const guideProfileId = await this.profileIdOf(userId);
    const earlyMinutes = await this.settings.getNumber(
      SettingKey.START_EARLY_MIN,
    );
    await this.dataSource.transaction(async (manager) => {
      const booking = await this.guideBooking(
        bookingId,
        guideProfileId,
        manager,
      );
      if (booking.guideStartedAt) throw new AlreadyStartedException();
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new InvalidBookingStatusException(booking.status);
      }
      const now = new Date();
      if (
        !canMarkStart(
          now,
          bookingStartsAt(booking),
          bookingEndsAt(booking),
          earlyMinutes,
          0,
        )
      ) {
        throw new StartWindowClosedException();
      }
      const route = booking.route!;
      booking.status = BookingStatus.IN_PROGRESS;
      booking.guideStartedAt = now;
      booking.guideStartLatitude = latitude;
      booking.guideStartLongitude = longitude;
      booking.guideStartDistanceM = distanceMeters(
        latitude,
        longitude,
        route.startLatitude,
        route.startLongitude,
      );
      await this.bookings.save(booking, manager);
    });
    return this.dto(bookingId, true);
  }

  async startByTourist(
    touristId: string,
    bookingId: string,
  ): Promise<BookingDto> {
    const [earlyMinutes, graceHours] = await Promise.all([
      this.settings.getNumber(SettingKey.START_EARLY_MIN),
      this.settings.getNumber(SettingKey.START_CONFIRM_GRACE_HOURS),
    ]);
    await this.dataSource.transaction(async (manager) => {
      const booking = await this.touristBooking(bookingId, touristId, manager);
      if (booking.touristStartedAt) throw new AlreadyStartedException();
      if (!STARTABLE.has(booking.status)) {
        throw new InvalidBookingStatusException(booking.status);
      }
      const now = new Date();
      if (
        !canMarkStart(
          now,
          bookingStartsAt(booking),
          bookingEndsAt(booking),
          earlyMinutes,
          graceHours,
        )
      ) {
        throw new StartWindowClosedException();
      }
      booking.touristStartedAt = now;
      await this.bookings.save(booking, manager);
    });
    return this.dto(bookingId, false);
  }

  async reportNoShow(
    touristId: string,
    bookingId: string,
    description: string,
  ): Promise<DisputeDto> {
    const [toleranceMinutes, graceHours] = await Promise.all([
      this.settings.getNumber(SettingKey.NO_SHOW_TOLERANCE_MIN),
      this.settings.getNumber(SettingKey.START_CONFIRM_GRACE_HOURS),
    ]);
    const disputeId = await this.dataSource.transaction(async (manager) => {
      const booking = await this.touristBooking(bookingId, touristId, manager);
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new InvalidBookingStatusException(booking.status);
      }
      if (await this.disputes.existsForBooking(booking.id, manager)) {
        throw new DisputeAlreadyOpenException();
      }
      const now = new Date();
      const startsAt = bookingStartsAt(booking);
      const reportable =
        canReportNoShow(
          now,
          startsAt,
          toleranceMinutes,
          booking.guideStartedAt,
        ) && canMarkStart(now, startsAt, bookingEndsAt(booking), 0, graceHours);
      if (!reportable) throw new NoShowReportTooEarlyException();
      const dispute = await this.disputes.create(
        {
          bookingId: booking.id,
          reason: DisputeReason.GUIDE_NO_SHOW,
          openedBy: DisputeParty.TOURIST,
          description,
        },
        manager,
      );
      await this.notices.notifyAdmins(manager, NotificationType.CASE_OPENED, {
        kind: 'NO_SHOW_CASE',
        code: booking.code,
        section: 'disputas',
      });
      return dispute.id;
    });
    const dispute = await this.disputes.findById(disputeId);
    return DisputeDto.fromEntity(dispute!);
  }

  private async guideBooking(
    bookingId: string,
    guideProfileId: string,
    manager: EntityManager,
  ): Promise<Booking> {
    await this.bookings.findForUpdate(bookingId, manager);
    const booking = await this.bookings.findDetailById(bookingId, manager);
    if (!booking || booking.guideProfileId !== guideProfileId) {
      throw new BookingNotFoundException();
    }
    return booking;
  }

  private async touristBooking(
    bookingId: string,
    touristId: string,
    manager: EntityManager,
  ): Promise<Booking> {
    await this.bookings.findForUpdate(bookingId, manager);
    const booking = await this.bookings.findDetailById(bookingId, manager);
    if (
      !booking ||
      booking.touristId !== touristId ||
      !booking.guideProfileId
    ) {
      throw new BookingNotFoundException();
    }
    return booking;
  }

  private async profileIdOf(userId: string): Promise<string> {
    const profile = await this.guides.findIdByUserId(userId);
    if (!profile) throw new GuideNotFoundException();
    return profile.id;
  }

  private async dto(bookingId: string, viewedByGuide: boolean) {
    const booking = await this.bookings.findDetailById(bookingId);
    return BookingDto.fromEntity(booking!, viewedByGuide);
  }
}
