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
  ApiConflictResponse,
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
  AvailableDateDto,
  CreateAvailableDateDto,
} from '../dto/available-date.dto.js';
import { CommitmentDto, CreateCommitmentDto } from '../dto/commitment.dto.js';
import {
  GuideScheduleDto,
  SetAvailabilityModeDto,
} from '../dto/guide-schedule.dto.js';
import { SetAvailabilityDto } from '../dto/set-availability.dto.js';
import { GuideAvailabilityService } from '../services/guide-availability.service.js';

@ApiTags('Guides / Schedule')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.GUIDE)
@Controller('guides/me/schedule')
export class GuideAvailabilityController {
  constructor(private readonly availability: GuideAvailabilityService) {}

  @Get()
  @ApiOperation({
    summary: 'Modalidad, horarios semanales, fechas disponibles y compromisos',
  })
  @ApiOkResponse({ type: GuideScheduleDto })
  getSchedule(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GuideScheduleDto> {
    return this.availability.getSchedule(user.id);
  }

  @Put('mode')
  @ApiOperation({ summary: 'Elegir la modalidad semanal o por fecha' })
  @ApiOkResponse({ type: GuideScheduleDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  setMode(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetAvailabilityModeDto,
  ): Promise<GuideScheduleDto> {
    return this.availability.setMode(user.id, dto.mode);
  }

  @Put('slots')
  @ApiOperation({ summary: 'Reemplazar los horarios semanales' })
  @ApiOkResponse({ type: GuideScheduleDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  setSlots(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetAvailabilityDto,
  ): Promise<GuideScheduleDto> {
    return this.availability.setSlots(user.id, dto.slots);
  }

  @Post('available-dates')
  @ApiOperation({ summary: 'Agregar una fecha disponible con su horario' })
  @ApiCreatedResponse({ type: AvailableDateDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  addAvailableDate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAvailableDateDto,
  ): Promise<AvailableDateDto> {
    return this.availability.addAvailableDate(user.id, dto);
  }

  @Delete('available-dates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar una fecha disponible' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  removeAvailableDate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.availability.removeAvailableDate(user.id, id);
  }

  @Post('commitments')
  @ApiOperation({
    summary:
      'Registrar un compromiso fuera de la plataforma (transfer, tour, vacaciones)',
  })
  @ApiCreatedResponse({ type: CommitmentDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  addCommitment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommitmentDto,
  ): Promise<CommitmentDto> {
    return this.availability.addCommitment(user.id, dto);
  }

  @Delete('commitments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar un compromiso' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  removeCommitment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.availability.removeCommitment(user.id, id);
  }
}
