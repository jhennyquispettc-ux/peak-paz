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
import { AgencyDepartureDto } from '../../group-departures/dto/departure.dto.js';
import { UserRole } from '../../users/users.enums.js';
import { GuideCancellationDto } from '../dto/cancellation.dto.js';
import { DepartureLifecycleService } from '../services/departure-lifecycle.service.js';

@ApiTags('Agencies / Departures')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.AGENCY)
@Controller('agencies/me/departures')
export class DepartureCancellationController {
  constructor(private readonly lifecycle: DepartureLifecycleService) {}

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cancelar una salida. Todos los inscritos que pagaron reciben el 100%',
  })
  @ApiOkResponse({ type: AgencyDepartureDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiBadGatewayResponse({ type: ErrorResponseDto })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuideCancellationDto,
  ): Promise<AgencyDepartureDto> {
    return this.lifecycle.cancelByAgency(
      user.id,
      id,
      dto.reason,
      dto.weather ?? false,
    );
  }
}
