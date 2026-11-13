import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.js';
import { UserRole } from '../../users/users.enums.js';
import { BookingReasonDto } from '../dto/booking-action.dto.js';
import { BookingQueryDto } from '../dto/booking-query.dto.js';
import { BookingDto, BookingPageDto } from '../dto/booking.dto.js';
import { GuideBookingsService } from '../services/guide-bookings.service.js';

@ApiTags('Guides / Bookings')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.GUIDE)
@Controller('guides/me/bookings')
export class GuideBookingsController {
  constructor(private readonly guideBookings: GuideBookingsService) {}

  @Get()
  @ApiOperation({ summary: 'Solicitudes y reservas del guía' })
  @ApiOkResponse({ type: BookingPageDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BookingQueryDto,
  ): Promise<BookingPageDto> {
    return this.guideBookings.list(user.id, query);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aceptar una solicitud. Abre el plazo de pago del turista',
  })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingDto> {
    return this.guideBookings.accept(user.id, id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rechazar una solicitud' })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BookingReasonDto,
  ): Promise<BookingDto> {
    return this.guideBookings.reject(user.id, id, dto.reason);
  }
}
