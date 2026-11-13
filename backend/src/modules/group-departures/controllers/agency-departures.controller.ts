import {
  Body,
  Controller,
  Get,
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
import {
  AgencyDepartureDto,
  CreateDepartureDto,
  DepartureDto,
  ManualBookingDto,
} from '../dto/departure.dto.js';
import { AgencyDeparturesService } from '../services/agency-departures.service.js';

@ApiTags('Agencies / Departures')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.AGENCY)
@Controller('agencies/me/departures')
export class AgencyDeparturesController {
  constructor(private readonly agencyDepartures: AgencyDeparturesService) {}

  @Post()
  @ApiOperation({ summary: 'Publicar una salida grupal' })
  @ApiCreatedResponse({ type: DepartureDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDepartureDto,
  ): Promise<DepartureDto> {
    return this.agencyDepartures.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Salidas publicadas por la agencia' })
  @ApiOkResponse({ type: [DepartureDto] })
  list(@CurrentUser() user: AuthenticatedUser): Promise<DepartureDto[]> {
    return this.agencyDepartures.listMine(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Salida con la lista de inscritos' })
  @ApiOkResponse({ type: AgencyDepartureDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AgencyDepartureDto> {
    return this.agencyDepartures.getMine(user.id, id);
  }

  @Post(':id/manual-bookings')
  @ApiOperation({
    summary:
      'Registrar personas que la agencia inscribió fuera de la plataforma',
  })
  @ApiCreatedResponse({ type: AgencyDepartureDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  addManual(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualBookingDto,
  ): Promise<AgencyDepartureDto> {
    return this.agencyDepartures.addManualBooking(user.id, id, dto);
  }
}
