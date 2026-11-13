import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { laPazInstant } from '../../../common/time/la-paz-time.js';
import { BookingStatus } from '../../bookings/bookings.enums.js';
import { BookingDto } from '../../bookings/dto/booking.dto.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import {
  BookingNotFoundException,
  InvalidBookingStatusException,
} from '../../bookings/exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { GuideNotFoundException } from '../../guides/exceptions/guides.exceptions.js';
import { GuidesRepository } from '../../guides/repositories/guides.repository.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { CancellationResultDto } from '../dto/cancellation.dto.js';
import { RefundDto } from '../dto/payment.dto.js';
import { Refund } from '../entities/refund.entity.js';
import { TourAlreadyStartedException } from '../exceptions/payments.exceptions.js';
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
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async cancelByTourist(
    touristId: string,
    bookingId: string,
    reason: string | undefined,
  ): Promise<CancellationResultDto> {
    const minDays = await this.settings.getNumber(SettingKey.REFUND_MIN_DAYS);

    const outcome = await this.dataSource.transaction(async (manager) => {
      const booking = await this.bookings.findForUpdate(bookingId, manager);
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

      const startsAt = laPazInstant(booking.tourDate!, booking.startTime!);
      if (isRefundable(startsAt, now, minDays)) {
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

    return this.result(bookingId, outcome, false);
  }

  async cancelByGuide(
    userId: string,
    bookingId: string,
    reason: string,
    weather: boolean,
  ): Promise<CancellationResultDto> {
    const profile = await this.guides.findIdByUserId(userId);
    if (!profile) throw new GuideNotFoundException();
    const status = weather
      ? BookingStatus.CANCELLED_WEATHER
      : BookingStatus.CANCELLED_BY_PROVIDER;

    const outcome = await this.dataSource.transaction(async (manager) => {
      const booking = await this.bookings.findForUpdate(bookingId, manager);
      if (!booking || booking.guideProfileId !== profile.id) {
        throw new BookingNotFoundException();
      }
      const now = new Date();

      if (booking.status === BookingStatus.ACCEPTED) {
        await this.close(booking, status, reason, now, manager);
        return null;
      }
      this.assertConfirmedAndNotStarted(booking, now);

      const refund = await this.refundCapture(
        booking,
        weather ? RefundReason.WEATHER : RefundReason.PROVIDER_CANCELLATION,
        manager,
      );
      await this.close(booking, status, reason, now, manager);
      return refund;
    });

    return this.result(bookingId, outcome, true);
  }

  private assertConfirmedAndNotStarted(booking: Booking, now: Date): void {
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new InvalidBookingStatusException(booking.status);
    }
    if (laPazInstant(booking.tourDate!, booking.startTime!) <= now) {
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
  ): Promise<CancellationResultDto> {
    const booking = await this.bookings.findDetailById(bookingId);
    return {
      booking: BookingDto.fromEntity(booking!, viewedByGuide),
      refund: outcome
        ? RefundDto.fromEntity(outcome.refund, outcome.currency)
        : null,
    };
  }
}
