import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
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
import {
  PaymentDto,
  StartedPaymentDto,
  StartPaymentDto,
} from '../dto/payment.dto.js';
import { BookingPaymentsService } from '../services/booking-payments.service.js';

@ApiTags('Payments')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller('bookings/:bookingId/payments')
export class BookingPaymentsController {
  constructor(private readonly bookingPayments: BookingPaymentsService) {}

  @Post()
  @Roles(UserRole.TOURIST)
  @ApiOperation({
    summary:
      'Aceptar los términos y crear la orden de pago de una reserva aceptada',
  })
  @ApiCreatedResponse({ type: StartedPaymentDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiBadGatewayResponse({ type: ErrorResponseDto })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Body() _dto: StartPaymentDto,
    @Ip() ip: string,
  ): Promise<StartedPaymentDto> {
    return this.bookingPayments.start(user.id, bookingId, ip);
  }

  @Post(':paymentId/capture')
  @Roles(UserRole.TOURIST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cobrar la orden aprobada por el turista y confirmar la reserva',
  })
  @ApiOkResponse({ type: PaymentDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiBadGatewayResponse({ type: ErrorResponseDto })
  capture(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ): Promise<PaymentDto> {
    return this.bookingPayments.capture(user.id, bookingId, paymentId);
  }

  @Get()
  @ApiOperation({ summary: 'Pagos de una reserva (turista dueño o admin)' })
  @ApiOkResponse({ type: [PaymentDto] })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('bookingId', ParseUUIDPipe) bookingId: string,
  ): Promise<PaymentDto[]> {
    return this.bookingPayments.listForBooking(user, bookingId);
  }
}
