import { Injectable } from '@nestjs/common';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { AdminBookingQueryDto } from '../dto/booking-query.dto.js';
import { BookingDto, BookingPageDto } from '../dto/booking.dto.js';
import { BookingsRepository } from '../repositories/bookings.repository.js';

@Injectable()
export class AdminBookingsService {
  constructor(private readonly bookings: BookingsRepository) {}

  async list(query: AdminBookingQueryDto): Promise<BookingPageDto> {
    const [bookings, total] = await this.bookings.findPage({
      skip: query.skip,
      take: query.limit,
      status: query.status,
      type: query.type,
    });
    return {
      data: bookings.map((booking) => BookingDto.fromEntity(booking)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }
}
