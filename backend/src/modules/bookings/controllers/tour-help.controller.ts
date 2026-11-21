import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
  AdminTourHelpDto,
  AdminTourHelpPageDto,
  AttendTourHelpDto,
  CreateTourHelpDto,
  TourHelpDto,
  TourHelpQueryDto,
} from '../dto/tour-help.dto.js';
import { TourHelpService } from '../services/tour-help.service.js';

@ApiTags('Tour help')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller()
export class TourHelpController {
  constructor(private readonly help: TourHelpService) {}

  @Post('bookings/:id/help')
  @Roles(UserRole.TOURIST)
  @ApiOperation({
    summary:
      'Pedir ayuda durante el tour. Avisa al administrador, sin mover dinero ni sancionar',
  })
  @ApiCreatedResponse({ type: TourHelpDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  ask(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTourHelpDto,
  ): Promise<TourHelpDto> {
    return this.help.ask(user.id, id, dto.description);
  }

  @Get('bookings/:id/help')
  @Roles(UserRole.TOURIST)
  @ApiOperation({ summary: 'Ver mis pedidos de ayuda de un tour' })
  @ApiOkResponse({ type: [TourHelpDto] })
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TourHelpDto[]> {
    return this.help.listForTourist(user.id, id);
  }

  @Get('admin/help-requests')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Listar pedidos de ayuda con los contactos, los más antiguos primero',
  })
  @ApiOkResponse({ type: AdminTourHelpPageDto })
  list(@Query() query: TourHelpQueryDto): Promise<AdminTourHelpPageDto> {
    return this.help.list(query);
  }

  @Post('admin/help-requests/:id/attend')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar cómo se atendió un pedido de ayuda y avisar al turista',
  })
  @ApiOkResponse({ type: AdminTourHelpDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  attend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AttendTourHelpDto,
  ): Promise<AdminTourHelpDto> {
    return this.help.attend(user.id, id, dto.note);
  }
}
