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
import {
  DisputeDto,
  GuideStartDto,
  NoShowReportDto,
} from '../dto/tour-check.dto.js';
import { TourChecksService } from '../services/tour-checks.service.js';

@ApiTags('Tour checks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@ApiConflictResponse({ type: ErrorResponseDto })
@Controller()
export class TourChecksController {
  constructor(private readonly checks: TourChecksService) {}

  @Post('guides/me/bookings/:id/reconfirm')
  @Roles(UserRole.GUIDE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Reconfirmar que el guía irá al tour. Se abre 72 horas antes y vence 24 horas antes del inicio',
  })
  @ApiOkResponse({ type: BookingDto })
  reconfirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingDto> {
    return this.checks.reconfirm(user.id, id);
  }

  @Post('guides/me/bookings/:id/start')
  @Roles(UserRole.GUIDE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'El guía marca el inicio del tour con su ubicación, desde una hora antes hasta el final',
  })
  @ApiOkResponse({ type: BookingDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  startByGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuideStartDto,
  ): Promise<BookingDto> {
    return this.checks.startByGuide(user.id, id, dto.latitude, dto.longitude);
  }

  @Post('bookings/:id/start')
  @Roles(UserRole.TOURIST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'El turista confirma que el tour empezó, desde una hora antes hasta 24 horas después del final',
  })
  @ApiOkResponse({ type: BookingDto })
  startByTourist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingDto> {
    return this.checks.startByTourist(user.id, id);
  }

  @Post('bookings/:id/no-show')
  @Roles(UserRole.TOURIST)
  @ApiOperation({
    summary:
      'Reportar que el guía no llegó. Se puede después de 30 minutos de espera y abre una disputa',
  })
  @ApiCreatedResponse({ type: DisputeDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  reportNoShow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: NoShowReportDto,
  ): Promise<DisputeDto> {
    return this.checks.reportNoShow(user.id, id, dto.description);
  }
}
