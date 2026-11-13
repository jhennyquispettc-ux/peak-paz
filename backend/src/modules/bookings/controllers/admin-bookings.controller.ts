import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { UserRole } from '../../users/users.enums.js';
import { AdminBookingQueryDto } from '../dto/booking-query.dto.js';
import { BookingDto, BookingPageDto } from '../dto/booking.dto.js';
import { BookingsRepository } from '../repositories/bookings.repository.js';

@ApiTags('Admin / Bookings')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.ADMIN)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly bookings: BookingsRepository) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las reservas' })
  @ApiOkResponse({ type: BookingPageDto })
  async list(@Query() query: AdminBookingQueryDto): Promise<BookingPageDto> {
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
