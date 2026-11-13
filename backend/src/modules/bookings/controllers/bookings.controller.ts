import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { BookingQueryDto } from '../dto/booking-query.dto.js';
import { BookingDto, BookingPageDto } from '../dto/booking.dto.js';
import { CreateBookingDto } from '../dto/create-booking.dto.js';
import { BookingRequestsService } from '../services/booking-requests.service.js';

@ApiTags('Bookings')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Controller('bookings')
export class BookingsController {
  constructor(private readonly requests: BookingRequestsService) {}

  @Post()
  @Roles(UserRole.TOURIST)
  @ApiOperation({ summary: 'Solicitar un guía particular para una ruta' })
  @ApiCreatedResponse({ type: BookingDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingDto> {
    return this.requests.create(user.id, dto);
  }

  @Get('me')
  @Roles(UserRole.TOURIST)
  @ApiOperation({ summary: 'Reservas del turista' })
  @ApiOkResponse({ type: BookingPageDto })
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: BookingQueryDto,
  ): Promise<BookingPageDto> {
    return this.requests.listMine(user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ver una reserva (turista dueño, guía asignado o admin)',
  })
  @ApiOkResponse({ type: BookingDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingDto> {
    return this.requests.getForViewer(user, id);
  }
}
