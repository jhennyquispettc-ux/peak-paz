import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
  BlockedDateDto,
  CreateBlockedDateDto,
} from '../dto/blocked-date.dto.js';
import { GuideScheduleDto } from '../dto/guide-schedule.dto.js';
import { SetAvailabilityDto } from '../dto/set-availability.dto.js';
import { GuideAvailabilityService } from '../services/guide-availability.service.js';

@ApiTags('Guides / Schedule')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.GUIDE)
@Controller('guides/me')
export class GuideAvailabilityController {
  constructor(private readonly availability: GuideAvailabilityService) {}

  @Get('schedule')
  @ApiOperation({ summary: 'Horarios semanales y fechas bloqueadas' })
  @ApiOkResponse({ type: GuideScheduleDto })
  getSchedule(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GuideScheduleDto> {
    return this.availability.getSchedule(user.id);
  }

  @Put('schedule/slots')
  @ApiOperation({ summary: 'Reemplazar los horarios semanales' })
  @ApiOkResponse({ type: GuideScheduleDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  setSlots(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetAvailabilityDto,
  ): Promise<GuideScheduleDto> {
    return this.availability.setSlots(user.id, dto.slots);
  }

  @Post('schedule/blocked-dates')
  @ApiOperation({ summary: 'Bloquear un rango de fechas' })
  @ApiCreatedResponse({ type: BlockedDateDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  addBlockedDate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBlockedDateDto,
  ): Promise<BlockedDateDto> {
    return this.availability.addBlockedDate(user.id, dto);
  }

  @Delete('schedule/blocked-dates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Liberar un rango bloqueado' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  removeBlockedDate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.availability.removeBlockedDate(user.id, id);
  }
}
