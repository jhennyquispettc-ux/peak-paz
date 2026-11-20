import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { AgenciesRepository } from '../../agencies/repositories/agencies.repository.js';
import { bookingEndsAt } from '../../bookings/booking-schedule.js';
import { BookingStatus } from '../../bookings/bookings.enums.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import {
  BookingNotFoundException,
  InvalidBookingStatusException,
} from '../../bookings/exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { GuidesRepository } from '../../guides/repositories/guides.repository.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { ProviderKind, SanctionedProvider } from '../../strikes/sanctions.js';
import {
  AdminReviewDto,
  AdminReviewPageDto,
  AdminReviewQueryDto,
  CreateReviewDto,
  ReviewDto,
  ReviewPageDto,
  ReviewVisibilityDto,
} from '../dto/review.dto.js';
import {
  HiddenReasonRequiredException,
  ReviewAlreadyExistsException,
  ReviewNotFoundException,
  ReviewWindowClosedException,
} from '../exceptions/reviews.exceptions.js';
import { ReviewsRepository } from '../repositories/reviews.repository.js';
import { canReview, roundRating } from '../review-rules.js';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviews: ReviewsRepository,
    private readonly bookings: BookingsRepository,
    private readonly guides: GuidesRepository,
    private readonly agencies: AgenciesRepository,
    private readonly settings: SettingsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(
    touristId: string,
    bookingId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewDto> {
    const windowDays = await this.settings.getNumber(
      SettingKey.REVIEW_WINDOW_DAYS,
    );
    await this.dataSource.transaction(async (manager) => {
      await this.bookings.findForUpdate(bookingId, manager);
      const booking = await this.bookings.findDetailById(bookingId, manager);
      if (!booking || booking.touristId !== touristId) {
        throw new BookingNotFoundException();
      }
      if (booking.status !== BookingStatus.COMPLETED) {
        throw new InvalidBookingStatusException(booking.status);
      }
      if (!canReview(new Date(), bookingEndsAt(booking), windowDays)) {
        throw new ReviewWindowClosedException(windowDays);
      }
      if (await this.reviews.existsForBooking(booking.id, manager)) {
        throw new ReviewAlreadyExistsException();
      }
      await this.reviews.create(
        {
          bookingId: booking.id,
          rating: dto.rating,
          comment: dto.comment ?? null,
        },
        manager,
      );
      await this.refreshRating(this.providerOf(booking), manager);
    });
    return this.getForTourist(touristId, bookingId);
  }

  async getForTourist(
    touristId: string,
    bookingId: string,
  ): Promise<ReviewDto> {
    const review = await this.reviews.findByBooking(bookingId);
    if (!review || review.booking.touristId !== touristId) {
      throw new ReviewNotFoundException();
    }
    return ReviewDto.fromEntity(review);
  }

  listForGuide(
    guideProfileId: string,
    query: PaginationQueryDto,
  ): Promise<ReviewPageDto> {
    return this.publicPage(
      { kind: ProviderKind.GUIDE, id: guideProfileId },
      query,
    );
  }

  listForAgency(
    agencyId: string,
    query: PaginationQueryDto,
  ): Promise<ReviewPageDto> {
    return this.publicPage({ kind: ProviderKind.AGENCY, id: agencyId }, query);
  }

  async listForAdmin(query: AdminReviewQueryDto): Promise<AdminReviewPageDto> {
    const [reviews, total] = await this.reviews.findPage({
      skip: query.skip,
      take: query.limit,
      hidden: query.hidden,
    });
    return {
      data: reviews.map((review) => AdminReviewDto.fromReview(review)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async setVisibility(
    adminId: string,
    id: string,
    dto: ReviewVisibilityDto,
  ): Promise<AdminReviewDto> {
    if (dto.hidden && !dto.reason) throw new HiddenReasonRequiredException();
    await this.dataSource.transaction(async (manager) => {
      await this.reviews.lockById(id, manager);
      const review = await this.reviews.findById(id, manager);
      if (!review) throw new ReviewNotFoundException();
      review.hiddenAt = dto.hidden ? new Date() : null;
      review.hiddenById = dto.hidden ? adminId : null;
      review.hiddenReason = dto.hidden ? dto.reason! : null;
      await this.reviews.save(review, manager);
      await this.refreshRating(this.providerOf(review.booking), manager);
    });
    const review = await this.reviews.findById(id);
    return AdminReviewDto.fromReview(review!);
  }

  private async publicPage(
    provider: SanctionedProvider,
    query: PaginationQueryDto,
  ): Promise<ReviewPageDto> {
    const [reviews, total] = await this.reviews.findPage({
      skip: query.skip,
      take: query.limit,
      provider,
      hidden: false,
    });
    return {
      data: reviews.map((review) => ReviewDto.fromEntity(review)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  private async refreshRating(
    provider: SanctionedProvider,
    manager: EntityManager,
  ): Promise<void> {
    const { average, count } = await this.reviews.ratingFor(provider, manager);
    const rating = roundRating(average);
    if (provider.kind === ProviderKind.GUIDE) {
      await this.guides.updateRating(provider.id, rating, count, manager);
    } else {
      await this.agencies.updateRating(provider.id, rating, count, manager);
    }
  }

  private providerOf(booking: Booking): SanctionedProvider {
    return booking.guideProfileId
      ? { kind: ProviderKind.GUIDE, id: booking.guideProfileId }
      : { kind: ProviderKind.AGENCY, id: booking.groupDeparture!.agencyId };
  }
}
