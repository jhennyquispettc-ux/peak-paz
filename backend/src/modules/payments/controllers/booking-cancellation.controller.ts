import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
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
import {
  CancellationResultDto,
  GuideCancellationDto,
  TouristCancellationDto,
} from '../dto/cancellation.dto.js';
import { BookingCancellationService } from '../services/booking-cancellation.service.js';

@ApiTags('Bookings')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@ApiConflictResponse({ type: ErrorResponseDto })
@ApiBadGatewayResponse({ type: ErrorResponseDto })
@Controller()
export class BookingCancellationController {
  constructor(private readonly cancellations: BookingCancellationService) {}

  @Post('bookings/:id/cancel')
  @Roles(UserRole.TOURIST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cancelar una reserva. Pagada con 7 días o más de anticipación se reembolsa el 100%',
  })
  @ApiOkResponse({ type: CancellationResultDto })
  cancelByTourist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TouristCancellationDto,
  ): Promise<CancellationResultDto> {
    return this.cancellations.cancelByTourist(user.id, id, dto.reason);
  }

  @Post('guides/me/bookings/:id/cancel')
  @Roles(UserRole.GUIDE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cancelar una reserva aceptada o pagada. El turista recibe el 100% si ya pagó',
  })
  @ApiOkResponse({ type: CancellationResultDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  cancelByGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuideCancellationDto,
  ): Promise<CancellationResultDto> {
    return this.cancellations.cancelByGuide(
      user.id,
      id,
      dto.reason,
      dto.weather ?? false,
    );
  }
}
