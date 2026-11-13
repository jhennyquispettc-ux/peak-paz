import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
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
  GuideAgendaDto,
  GuideAgendaQueryDto,
} from '../dto/guide-agenda.dto.js';
import { GuideAgendaService } from '../services/guide-agenda.service.js';

@ApiTags('Guides / Schedule')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.GUIDE)
@Controller('guides/me/agenda')
export class GuideAgendaController {
  constructor(private readonly agenda: GuideAgendaService) {}

  @Get()
  @ApiOperation({
    summary:
      'Agenda del guía: horarios disponibles, compromisos y reservas de Peak Paz',
  })
  @ApiOkResponse({ type: GuideAgendaDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GuideAgendaQueryDto,
  ): Promise<GuideAgendaDto> {
    return this.agenda.get(user.id, query.from, query.to);
  }
}
