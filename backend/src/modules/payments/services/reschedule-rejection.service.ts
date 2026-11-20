import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BookingDto } from '../../bookings/dto/booking.dto.js';
import { BookingNotFoundException } from '../../bookings/exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../../bookings/repositories/bookings.repository.js';
import { ReschedulesService } from '../../bookings/services/reschedules.service.js';
import { CancellationReviewsService } from '../../strikes/services/cancellation-reviews.service.js';
import { CancellationResultDto } from '../dto/cancellation.dto.js';
import { RefundDto } from '../dto/payment.dto.js';
import { RefundReason } from '../payments.enums.js';
import { BookingCancellationService } from './booking-cancellation.service.js';

@Injectable()
export class RescheduleRejectionService {
  constructor(
    private readonly bookings: BookingsRepository,
    private readonly reschedules: ReschedulesService,
    private readonly cancellations: BookingCancellationService,
    private readonly reviews: CancellationReviewsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async reject(
    touristId: string,
    bookingId: string,
    rescheduleId: string,
  ): Promise<CancellationResultDto> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      await this.bookings.findForUpdate(bookingId, manager);
      const booking = await this.bookings.findDetailById(bookingId, manager);
      if (!booking || booking.touristId !== touristId) {
        throw new BookingNotFoundException();
      }
      const reschedule = await this.reschedules.openReschedule(
        rescheduleId,
        booking,
        manager,
      );
      const now = new Date();
      const refund: RefundDto | null =
        await this.cancellations.cancelByProviderWithRefund(
          booking,
          RefundReason.RESCHEDULE_REJECTED,
          `El turista rechazó el cambio de fecha. Motivo del guía: ${reschedule.reason}`,
          now,
          manager,
        );
      await this.reschedules.markRejected(reschedule, now, manager);
      const review = await this.reviews.openForBooking(booking, null, manager);
      return { refund, reviewId: review.id };
    });

    const booking = await this.bookings.findDetailById(bookingId);
    return {
      booking: BookingDto.fromEntity(booking!),
      refund: outcome.refund,
      reviewId: outcome.reviewId,
    };
  }
}
