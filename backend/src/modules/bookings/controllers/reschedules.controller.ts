import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
import { BookingDto } from '../dto/booking.dto.js';
import { ProposeRescheduleDto, RescheduleDto } from '../dto/reschedule.dto.js';
import { ReschedulesService } from '../services/reschedules.service.js';

@ApiTags('Date changes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller()
export class ReschedulesController {
  constructor(private readonly reschedules: ReschedulesService) {}

  @Post('guides/me/bookings/:id/reschedules')
  @Roles(UserRole.GUIDE)
  @ApiOperation({
    summary:
      'Proponer otra fecha para una reserva pagada. Se mantiene la hora y el precio, y el turista acepta o rechaza',
  })
  @ApiCreatedResponse({ type: RescheduleDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  propose(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProposeRescheduleDto,
  ): Promise<RescheduleDto> {
    return this.reschedules.propose(user.id, id, dto);
  }

  @Get('guides/me/bookings/:id/reschedules')
  @Roles(UserRole.GUIDE)
  @ApiOperation({ summary: 'Ver los cambios de fecha propuestos' })
  @ApiOkResponse({ type: [RescheduleDto] })
  listForGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RescheduleDto[]> {
    return this.reschedules.listForGuide(user.id, id);
  }

  @Get('bookings/:id/reschedules')
  @Roles(UserRole.TOURIST)
  @ApiOperation({ summary: 'Ver los cambios de fecha que propuso el guía' })
  @ApiOkResponse({ type: [RescheduleDto] })
  listForTourist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RescheduleDto[]> {
    return this.reschedules.listForTourist(user.id, id);
  }

  @Post('bookings/:id/reschedules/:rescheduleId/accept')
  @Roles(UserRole.TOURIST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Aceptar la nueva fecha. La reserva se mueve y el guía debe volver a reconfirmar',
  })
  @ApiOkResponse({ type: BookingDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rescheduleId', ParseUUIDPipe) rescheduleId: string,
  ): Promise<BookingDto> {
    return this.reschedules.accept(user.id, id, rescheduleId);
  }
}
