import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { addDays, addMinutes } from '../../../common/time/la-paz-time.js';
import { GuideNotFoundException } from '../../guides/exceptions/guides.exceptions.js';
import { GuidesRepository } from '../../guides/repositories/guides.repository.js';
import { Route } from '../../routes/entities/route.entity.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { BookingStatus } from '../bookings.enums.js';
import { BookingDto, BookingPageDto } from '../dto/booking.dto.js';
import { BookingQueryDto } from '../dto/booking-query.dto.js';
import {
  BookingNotFoundException,
  GuideNotAvailableException,
  InvalidBookingStatusException,
  ResponseWindowClosedException,
} from '../exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../repositories/bookings.repository.js';

const DISPLACED_REASON =
  'The guide accepted another booking for the same dates.';

@Injectable()
export class GuideBookingsService {
  constructor(
    private readonly bookings: BookingsRepository,
    private readonly guides: GuidesRepository,
    private readonly settings: SettingsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async list(userId: string, query: BookingQueryDto): Promise<BookingPageDto> {
    const guideProfileId = await this.profileIdOf(userId);
    const [bookings, total] = await this.bookings.findPage({
      skip: query.skip,
      take: query.limit,
      guideProfileId,
      status: query.status,
    });
    return {
      data: bookings.map((booking) => BookingDto.fromEntity(booking, true)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async accept(userId: string, bookingId: string): Promise<BookingDto> {
    const guideProfileId = await this.profileIdOf(userId);
    const paymentMinutes = await this.settings.getNumber(
      SettingKey.PAYMENT_WINDOW_MIN,
    );

    await this.dataSource.transaction(async (manager) => {
      await this.guides.lockById(guideProfileId, manager);
      const booking = await this.bookings.findForUpdate(bookingId, manager);
      if (!booking || booking.guideProfileId !== guideProfileId) {
        throw new BookingNotFoundException();
      }
      if (booking.status !== BookingStatus.REQUESTED) {
        throw new InvalidBookingStatusException(booking.status);
      }
      const now = new Date();
      if (booking.respondBy && booking.respondBy <= now) {
        throw new ResponseWindowClosedException();
      }

      const route = await manager
        .getRepository(Route)
        .findOneByOrFail({ id: booking.routeId! });
      const span = {
        startDate: booking.tourDate!,
        endDate: addDays(booking.tourDate!, route.days - 1),
      };
      if (await this.bookings.hasConflict(guideProfileId, span, manager)) {
        throw new GuideNotAvailableException();
      }

      booking.status = BookingStatus.ACCEPTED;
      booking.acceptedAt = now;
      booking.payBy = addMinutes(now, paymentMinutes);
      await this.bookings.save(booking, manager);
      await this.bookings.rejectOverlappingRequests(
        guideProfileId,
        span,
        booking.id,
        DISPLACED_REASON,
        manager,
      );
    });

    return this.getOwn(guideProfileId, bookingId);
  }

  async reject(
    userId: string,
    bookingId: string,
    reason: string | undefined,
  ): Promise<BookingDto> {
    const guideProfileId = await this.profileIdOf(userId);
    const booking = await this.bookings.findDetailById(bookingId);
    if (!booking || booking.guideProfileId !== guideProfileId) {
      throw new BookingNotFoundException();
    }
    if (booking.status !== BookingStatus.REQUESTED) {
      throw new InvalidBookingStatusException(booking.status);
    }
    booking.status = BookingStatus.REJECTED;
    booking.cancellationReason = reason ?? null;
    await this.bookings.save(booking);
    return this.getOwn(guideProfileId, bookingId);
  }

  private async getOwn(
    guideProfileId: string,
    bookingId: string,
  ): Promise<BookingDto> {
    const booking = await this.bookings.findDetailById(bookingId);
    if (!booking || booking.guideProfileId !== guideProfileId) {
      throw new BookingNotFoundException();
    }
    return BookingDto.fromEntity(booking, true);
  }

  private async profileIdOf(userId: string): Promise<string> {
    const profile = await this.guides.findIdByUserId(userId);
    if (!profile) throw new GuideNotFoundException();
    return profile.id;
  }
}
