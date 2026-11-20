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
import { GuideSanctionsDto } from '../dto/strike.dto.js';
import { StrikesService } from '../services/strikes.service.js';

@ApiTags('Guide / Sanctions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.GUIDE)
@Controller('guides/me/sanctions')
export class GuideSanctionsController {
  constructor(private readonly strikes: StrikesService) {}

  @Get()
  @ApiOperation({
    summary: 'Ver mis strikes, si estoy oculto y las multas por descontar',
  })
  @ApiOkResponse({ type: GuideSanctionsDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(@CurrentUser() user: AuthenticatedUser): Promise<GuideSanctionsDto> {
    return this.strikes.summaryForGuide(user.id);
  }
}
