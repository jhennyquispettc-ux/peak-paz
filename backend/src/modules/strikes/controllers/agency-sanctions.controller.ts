import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { SanctionsSummaryDto } from '../dto/strike.dto.js';
import { StrikesService } from '../services/strikes.service.js';

@ApiTags('Agency / Sanctions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.AGENCY)
@Controller('agencies/me/sanctions')
export class AgencySanctionsController {
  constructor(private readonly strikes: StrikesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Ver los strikes de la agencia, si está oculta y las multas por descontar',
  })
  @ApiOkResponse({ type: SanctionsSummaryDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(@CurrentUser() user: AuthenticatedUser): Promise<SanctionsSummaryDto> {
    return this.strikes.summaryForAgency(user.id);
  }
}
