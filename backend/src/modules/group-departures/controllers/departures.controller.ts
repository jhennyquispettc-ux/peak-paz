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
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Public } from '../../auth/decorators/public.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.js';
import { BookingDto } from '../../bookings/dto/booking.dto.js';
import { UserRole } from '../../users/users.enums.js';
import {
  DepartureDto,
  DeparturePageDto,
  DepartureQueryDto,
  JoinDepartureDto,
} from '../dto/departure.dto.js';
import { DeparturesService } from '../services/departures.service.js';

@ApiTags('Group departures')
@Controller('departures')
export class DeparturesController {
  constructor(private readonly departures: DeparturesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Salidas grupales abiertas a inscripción' })
  @ApiOkResponse({ type: DeparturePageDto })
  list(@Query() query: DepartureQueryDto): Promise<DeparturePageDto> {
    return this.departures.listOpen(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Detalle de una salida grupal' })
  @ApiOkResponse({ type: DepartureDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<DepartureDto> {
    return this.departures.getById(id);
  }

  @Post(':id/bookings')
  @Roles(UserRole.TOURIST)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Inscribirse en una salida grupal. Abre el plazo de pago',
  })
  @ApiCreatedResponse({ type: BookingDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: JoinDepartureDto,
  ): Promise<BookingDto> {
    return this.departures.join(user.id, id, dto.peopleCount);
  }
}
