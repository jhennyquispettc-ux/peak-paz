import { Injectable } from '@nestjs/common';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import {
  addMinutes,
  laPazInstant,
  weekdayOf,
} from '../../../common/time/la-paz-time.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.js';
import {
  busyWindow,
  GuidesRepository,
} from '../../guides/repositories/guides.repository.js';
import { Route } from '../../routes/entities/route.entity.js';
import {
  RouteNotFoundException,
  StartTimeOutsideWindowException,
} from '../../routes/exceptions/routes.exceptions.js';
import { RoutesRepository } from '../../routes/repositories/routes.repository.js';
import { toMinutes } from '../../routes/services/itinerary.service.js';
import {
  TourInterval,
  TourIntervalService,
} from '../../routes/services/tour-interval.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { UserRole } from '../../users/users.enums.js';
import {
  BookingSource,
  BookingStatus,
  BookingType,
} from '../bookings.enums.js';
import { BookingDto, BookingPageDto } from '../dto/booking.dto.js';
import { BookingQueryDto } from '../dto/booking-query.dto.js';
import { CreateBookingDto } from '../dto/create-booking.dto.js';
import {
  BookingAlreadyRequestedException,
  BookingNotFoundException,
  GuideNotAuthorizedForRouteException,
  GuideNotAvailableException,
  InsufficientAdvanceException,
  TooManyPeopleException,
} from '../exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../repositories/bookings.repository.js';
import { generateBookingCode } from './booking-code.js';

@Injectable()
export class BookingRequestsService {
  constructor(
    private readonly bookings: BookingsRepository,
    private readonly routes: RoutesRepository,
    private readonly guides: GuidesRepository,
    private readonly settings: SettingsService,
    private readonly tourIntervals: TourIntervalService,
  ) {}

  async create(touristId: string, dto: CreateBookingDto): Promise<BookingDto> {
    const route = await this.routes.findById(dto.routeId);
    if (!route?.isPublished) throw new RouteNotFoundException();

    await this.assertPeopleCount(route, dto.peopleCount);
    this.assertStartWindow(route, dto.startTime);
    await this.assertAdvance(dto.tourDate, dto.startTime);
    const interval = await this.assertGuideAvailable(route, dto);

    if (
      await this.bookings.existsOpenRequest(
        touristId,
        dto.guideProfileId,
        dto.tourDate,
      )
    ) {
      throw new BookingAlreadyRequestedException();
    }

    const responseMinutes = await this.settings.getNumber(
      SettingKey.RESPONSE_WINDOW_MIN,
    );
    const booking = this.bookings.create({
      code: generateBookingCode(),
      type: BookingType.PRIVATE,
      source: BookingSource.WEB,
      touristId,
      guideProfileId: dto.guideProfileId,
      routeId: route.id,
      tourDate: dto.tourDate,
      startTime: dto.startTime,
      endsAt: interval.endsAt,
      peopleCount: dto.peopleCount,
      totalAmount: route.privatePrice,
      status: BookingStatus.REQUESTED,
      respondBy: addMinutes(new Date(), responseMinutes),
    });
    const saved = await this.bookings.save(booking);
    return this.getForTourist(touristId, saved.id);
  }

  async listMine(
    touristId: string,
    query: BookingQueryDto,
  ): Promise<BookingPageDto> {
    const [bookings, total] = await this.bookings.findPage({
      skip: query.skip,
      take: query.limit,
      touristId,
      status: query.status,
    });
    return {
      data: bookings.map((booking) => BookingDto.fromEntity(booking)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async getForViewer(
    viewer: AuthenticatedUser,
    id: string,
  ): Promise<BookingDto> {
    const booking = await this.bookings.findDetailById(id);
    if (!booking) throw new BookingNotFoundException();

    if (viewer.role === UserRole.ADMIN) return BookingDto.fromEntity(booking);
    if (booking.touristId === viewer.id) return BookingDto.fromEntity(booking);
    if (booking.guideProfile?.userId === viewer.id) {
      return BookingDto.fromEntity(booking, true);
    }
    throw new BookingNotFoundException();
  }

  private async getForTourist(
    touristId: string,
    id: string,
  ): Promise<BookingDto> {
    const booking = await this.bookings.findDetailById(id);
    if (!booking || booking.touristId !== touristId) {
      throw new BookingNotFoundException();
    }
    return BookingDto.fromEntity(booking);
  }

  private async assertPeopleCount(route: Route, people: number) {
    const platformMax = await this.settings.getNumber(
      SettingKey.PRIVATE_MAX_PEOPLE,
    );
    const max = Math.min(route.privateMaxPeople, platformMax);
    if (people > max) throw new TooManyPeopleException(max);
  }

  private assertStartWindow(route: Route, startTime: string) {
    const from = route.startTimeFrom.slice(0, 5);
    const to = route.startTimeTo.slice(0, 5);
    const start = toMinutes(startTime);
    if (start < toMinutes(from) || start > toMinutes(to)) {
      throw new StartTimeOutsideWindowException(from, to);
    }
  }

  private async assertAdvance(tourDate: string, startTime: string) {
    const hours = await this.settings.getNumber(SettingKey.MIN_ADVANCE_HOURS);
    const earliest = addMinutes(new Date(), hours * 60);
    if (laPazInstant(tourDate, startTime) < earliest) {
      throw new InsufficientAdvanceException(hours);
    }
  }

  private async assertGuideAvailable(
    route: Route,
    dto: CreateBookingDto,
  ): Promise<TourInterval> {
    const authorized = await this.guides.findAvailableForRoute({
      routeId: route.id,
      guideProfileId: dto.guideProfileId,
    });
    if (authorized.length === 0) {
      throw new GuideNotAuthorizedForRouteException();
    }

    const interval = await this.tourIntervals.forTour(
      route,
      dto.tourDate,
      dto.startTime,
    );
    const buffer = await this.settings.getNumber(
      SettingKey.SCHEDULE_BUFFER_MIN,
    );
    const available = await this.guides.findAvailableForRoute({
      routeId: route.id,
      guideProfileId: dto.guideProfileId,
      slot: {
        date: dto.tourDate,
        weekday: weekdayOf(dto.tourDate),
        startTime: dto.startTime,
        ...busyWindow(interval, buffer),
      },
    });
    if (available.length === 0) throw new GuideNotAvailableException();
    return interval;
  }
}
