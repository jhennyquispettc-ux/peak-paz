import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { bookingStartsAt } from '../../bookings/booking-schedule.js';
import { BookingSource, BookingStatus } from '../../bookings/bookings.enums.js';
import { BookingDto } from '../../bookings/dto/booking.dto.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import {
  BookingNotFoundException,
  InvalidBookingStatusException,
} from '../../bookings/exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { GuideNotFoundException } from '../../guides/exceptions/guides.exceptions.js';
import { GuidesRepository } from '../../guides/repositories/guides.repository.js';
import type { UploadedFileData } from '../../../common/types/uploaded-file.js';
import { CancellationReviewsService } from '../../strikes/services/cancellation-reviews.service.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { CancellationResultDto } from '../dto/cancellation.dto.js';
import { RefundDto } from '../dto/payment.dto.js';
import { Refund } from '../entities/refund.entity.js';
import { TourAlreadyStartedException } from '../exceptions/payments.exceptions.js';
import { reconfirmationMissed } from '../../bookings/tour-checks.js';
import { isRefundable } from '../money.js';
import {
  PaymentStatus,
  RefundReason,
  RefundStatus,
} from '../payments.enums.js';
import { PaymentProvider } from '../providers/payment-provider.js';
import { PaymentsRepository } from '../repositories/payments.repository.js';
import { PayoutsService } from './payouts.service.js';

const UNPAID_STATUSES = new Set([
  BookingStatus.REQUESTED,
  BookingStatus.ACCEPTED,
]);

interface RefundOutcome {
  refund: Refund;
  currency: string;
}

@Injectable()
export class BookingCancellationService {
  constructor(
    private readonly bookings: BookingsRepository,
    private readonly payments: PaymentsRepository,
    private readonly guides: GuidesRepository,
    private readonly payouts: PayoutsService,
    private readonly provider: PaymentProvider,
    private readonly settings: SettingsService,
    private readonly reviews: CancellationReviewsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async cancelByTourist(
    touristId: string,
    bookingId: string,
    reason: string | undefined,
  ): Promise<CancellationResultDto> {
    const [minDays, deadlineHours] = await Promise.all([
      this.settings.getNumber(SettingKey.REFUND_MIN_DAYS),
      this.settings.getNumber(SettingKey.RECONFIRM_DEADLINE_HOURS),
    ]);

    const outcome = await this.dataSource.transaction(async (manager) => {
      await this.bookings.findForUpdate(bookingId, manager);
      const booking = await this.bookings.findDetailById(bookingId, manager);
      if (!booking || booking.touristId !== touristId) {
        throw new BookingNotFoundException();
      }
      const now = new Date();

      if (UNPAID_STATUSES.has(booking.status)) {
        await this.close(
          booking,
          BookingStatus.CANCELLED_BY_TOURIST,
          reason,
          now,
          manager,
        );
        return null;
      }
      this.assertConfirmedAndNotStarted(booking, now);

      const startsAt = bookingStartsAt(booking);
      const guideMissedReconfirmation =
        booking.guideProfileId !== null &&
        reconfirmationMissed(
          now,
          startsAt,
          deadlineHours,
          booking.reconfirmedAt,
        );
      if (isRefundable(startsAt, now, minDays) || guideMissedReconfirmation) {
        const refund = await this.refundCapture(
          booking,
          RefundReason.TOURIST_CANCELLATION,
          manager,
        );
        await this.close(
          booking,
          BookingStatus.CANCELLED_BY_TOURIST,
          reason,
          now,
          manager,
        );
        return refund;
      }

      await this.close(
        booking,
        BookingStatus.CANCELLED_BY_TOURIST,
        reason,
        now,
        manager,
      );
      await this.payouts.createForBooking(booking, manager);
      return null;
    });

    return this.result(bookingId, outcome, false, null);
  }

  async cancelByGuide(
    userId: string,
    bookingId: string,
    reason: string,
    weather: boolean,
    evidence?: UploadedFileData,
  ): Promise<CancellationResultDto> {
    const profile = await this.guides.findIdByUserId(userId);
    if (!profile) throw new GuideNotFoundException();
    const status = weather
      ? BookingStatus.CANCELLED_WEATHER
      : BookingStatus.CANCELLED_BY_PROVIDER;

    const stored = await this.reviews.storeEvidence(profile.id, evidence);
    let reviewId: string | null = null;
    const work = this.dataSource.transaction(async (manager) => {
      await this.bookings.findForUpdate(bookingId, manager);
      const booking = await this.bookings.findDetailById(bookingId, manager);
      if (!booking || booking.guideProfileId !== profile.id) {
        throw new BookingNotFoundException();
      }
      const now = new Date();

      let refund: RefundOutcome | null = null;
      if (booking.status !== BookingStatus.ACCEPTED) {
        this.assertConfirmedAndNotStarted(booking, now);
        refund = await this.refundCapture(
          booking,
          weather ? RefundReason.WEATHER : RefundReason.PROVIDER_CANCELLATION,
          manager,
        );
      }
      await this.close(booking, status, reason, now, manager);
      const review = await this.reviews.openForBooking(
        booking,
        stored,
        manager,
      );
      reviewId = review.id;
      return refund;
    });

    let outcome: RefundOutcome | null;
    try {
      outcome = await work;
    } catch (error) {
      await this.reviews.discardEvidence(stored);
      throw error;
    }
    return this.result(bookingId, outcome, true, reviewId);
  }

  async cancelForProvider(
    booking: Booking,
    status: BookingStatus,
    refundReason: RefundReason,
    reason: string,
    now: Date,
    manager: EntityManager,
  ): Promise<boolean> {
    const refunded =
      (booking.status === BookingStatus.CONFIRMED ||
        booking.status === BookingStatus.IN_PROGRESS) &&
      booking.source === BookingSource.WEB;
    if (refunded) await this.refundCapture(booking, refundReason, manager);
    await this.close(booking, status, reason, now, manager);
    return refunded;
  }

  async cancelByProviderWithRefund(
    booking: Booking,
    refundReason: RefundReason,
    reason: string,
    now: Date,
    manager: EntityManager,
  ): Promise<RefundDto | null> {
    const outcome =
      booking.source === BookingSource.WEB
        ? await this.refundCapture(booking, refundReason, manager)
        : null;
    await this.close(
      booking,
      BookingStatus.CANCELLED_BY_PROVIDER,
      reason,
      now,
      manager,
    );
    return outcome
      ? RefundDto.fromEntity(outcome.refund, outcome.currency)
      : null;
  }

  private assertConfirmedAndNotStarted(booking: Booking, now: Date): void {
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new InvalidBookingStatusException(booking.status);
    }
    if (bookingStartsAt(booking) <= now) {
      throw new TourAlreadyStartedException();
    }
  }

  private async refundCapture(
    booking: Booking,
    reason: RefundReason,
    manager: EntityManager,
  ): Promise<RefundOutcome> {
    const payment = await this.payments.findCaptured(booking.id, manager);
    if (!payment?.externalCaptureId || payment.chargedAmount === null) {
      throw new InvalidBookingStatusException(booking.status);
    }
    const refund = await this.payments.saveRefund(
      {
        paymentId: payment.id,
        amount: payment.chargedAmount,
        reason,
        status: RefundStatus.PENDING,
      },
      manager,
    );

    const result = await this.provider.refund({
      captureId: payment.externalCaptureId,
      amount: payment.chargedAmount,
      currency: payment.chargeCurrency,
      requestId: refund.id,
    });
    refund.externalRefundId = result.refundId;
    refund.status = result.completed
      ? RefundStatus.COMPLETED
      : RefundStatus.PENDING;
    await manager.getRepository(Refund).save(refund);

    payment.status = PaymentStatus.REFUNDED;
    await this.payments.savePayment(payment, manager);
    return { refund, currency: payment.chargeCurrency };
  }

  private async close(
    booking: Booking,
    status: BookingStatus,
    reason: string | undefined,
    now: Date,
    manager: EntityManager,
  ): Promise<void> {
    booking.status = status;
    booking.cancelledAt = now;
    booking.cancellationReason = reason ?? null;
    await this.bookings.save(booking, manager);
    await this.payments.voidPending(booking.id, manager);
  }

  private async result(
    bookingId: string,
    outcome: RefundOutcome | null,
    viewedByGuide: boolean,
    reviewId: string | null,
  ): Promise<CancellationResultDto> {
    const booking = await this.bookings.findDetailById(bookingId);
    return {
      booking: BookingDto.fromEntity(booking!, viewedByGuide),
      refund: outcome
        ? RefundDto.fromEntity(outcome.refund, outcome.currency)
        : null,
      reviewId,
    };
  }
}
