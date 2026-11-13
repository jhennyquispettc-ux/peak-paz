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
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { UserRole } from '../../users/users.enums.js';
import { AdminBookingQueryDto } from '../dto/booking-query.dto.js';
import { BookingPageDto } from '../dto/booking.dto.js';
import { AdminBookingsService } from '../services/admin-bookings.service.js';

@ApiTags('Admin / Bookings')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.ADMIN)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly adminBookings: AdminBookingsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las reservas' })
  @ApiOkResponse({ type: BookingPageDto })
  list(@Query() query: AdminBookingQueryDto): Promise<BookingPageDto> {
    return this.adminBookings.list(query);
  }
}
