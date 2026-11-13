import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../../config/app.config.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.js';
import { BookingStatus } from '../../bookings/bookings.enums.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import {
  BookingNotFoundException,
  InvalidBookingStatusException,
} from '../../bookings/exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { SettingsService } from '../../settings/services/settings.service.js';
import { SettingKey } from '../../settings/setting-keys.js';
import { UserRole } from '../../users/users.enums.js';
import { PaymentDto, StartedPaymentDto } from '../dto/payment.dto.js';
import {
  PaymentNotFoundException,
  PaymentWindowClosedException,
} from '../exceptions/payments.exceptions.js';
import { toChargeAmount } from '../money.js';
import { PaymentStatus } from '../payments.enums.js';
import { PaymentProvider } from '../providers/payment-provider.js';
import { PaymentsRepository } from '../repositories/payments.repository.js';

const CHARGE_CURRENCY = 'USD';

@Injectable()
export class BookingPaymentsService {
  constructor(
    private readonly bookings: BookingsRepository,
    private readonly payments: PaymentsRepository,
    private readonly provider: PaymentProvider,
    private readonly settings: SettingsService,
    private readonly config: AppConfig,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async start(
    touristId: string,
    bookingId: string,
    ip: string | undefined,
  ): Promise<StartedPaymentDto> {
    const booking = await this.findTouristBooking(touristId, bookingId);
    this.assertPayable(booking, new Date());

    const bobPerUsd = await this.settings.getNumber(SettingKey.BOB_PER_USD);
    await this.payments.voidPending(booking.id);

    const payment = await this.payments.savePayment(
      this.payments.createPayment({
        bookingId: booking.id,
        provider: this.provider.name,
        amountBob: booking.totalAmount,
        chargeCurrency: CHARGE_CURRENCY,
        exchangeRate: bobPerUsd,
        chargedAmount: toChargeAmount(booking.totalAmount, bobPerUsd),
        status: PaymentStatus.PENDING,
      }),
    );

    const order = await this.provider.createOrder({
      reference: booking.code,
      description: `Peak Paz ${booking.code}: ${booking.route?.nameEs ?? 'tour'}`,
      amount: payment.chargedAmount!,
      currency: CHARGE_CURRENCY,
      requestId: payment.id,
    });
    payment.externalOrderId = order.orderId;
    await this.payments.savePayment(payment);

    booking.termsVersion = this.config.payments.termsVersion;
    booking.termsAcceptedAt = new Date();
    booking.termsAcceptedIp = ip?.slice(0, 45) ?? null;
    await this.bookings.save(booking);

    return Object.assign(PaymentDto.fromEntity(payment), {
      approveUrl: order.approveUrl,
    });
  }

  async capture(
    touristId: string,
    bookingId: string,
    paymentId: string,
  ): Promise<PaymentDto> {
    const captured = await this.dataSource.transaction(async (manager) => {
      const booking = await this.bookings.findForUpdate(bookingId, manager);
      if (!booking || booking.touristId !== touristId) {
        throw new BookingNotFoundException();
      }
      const payment = await this.payments.findPayment(
        paymentId,
        bookingId,
        manager,
      );
      if (!payment) throw new PaymentNotFoundException();

      if (
        payment.status === PaymentStatus.CAPTURED &&
        booking.status === BookingStatus.CONFIRMED
      ) {
        return payment;
      }
      if (
        payment.status !== PaymentStatus.PENDING ||
        !payment.externalOrderId
      ) {
        throw new InvalidBookingStatusException(payment.status);
      }
      const now = new Date();
      this.assertPayable(booking, now);

      const result = await this.provider.captureOrder(
        payment.externalOrderId,
        payment.id,
      );
      payment.status = PaymentStatus.CAPTURED;
      payment.externalCaptureId = result.captureId;
      payment.providerFee = result.fee;
      await this.payments.savePayment(payment, manager);

      booking.status = BookingStatus.CONFIRMED;
      booking.confirmedAt = now;
      await this.bookings.save(booking, manager);
      return payment;
    });
    return PaymentDto.fromEntity(captured);
  }

  async listForBooking(
    viewer: AuthenticatedUser,
    bookingId: string,
  ): Promise<PaymentDto[]> {
    const booking = await this.bookings.findDetailById(bookingId);
    const allowed =
      booking &&
      (viewer.role === UserRole.ADMIN || booking.touristId === viewer.id);
    if (!allowed) throw new BookingNotFoundException();
    const payments = await this.payments.findByBooking(bookingId);
    return payments.map((payment) => PaymentDto.fromEntity(payment));
  }

  private async findTouristBooking(
    touristId: string,
    bookingId: string,
  ): Promise<Booking> {
    const booking = await this.bookings.findDetailById(bookingId);
    if (!booking || booking.touristId !== touristId) {
      throw new BookingNotFoundException();
    }
    return booking;
  }

  private assertPayable(booking: Booking, now: Date): void {
    if (booking.status === BookingStatus.EXPIRED) {
      throw new PaymentWindowClosedException();
    }
    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new InvalidBookingStatusException(booking.status);
    }
    if (!booking.payBy || booking.payBy <= now) {
      throw new PaymentWindowClosedException();
    }
  }
}
