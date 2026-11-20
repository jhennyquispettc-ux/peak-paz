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
import {
  DisputeDto,
  DisputePageDto,
  DisputeQueryDto,
} from '../../bookings/dto/tour-check.dto.js';
import { UserRole } from '../../users/users.enums.js';
import {
  DisputeResolutionDto,
  ResolveDisputeDto,
} from '../dto/dispute-resolution.dto.js';
import { DisputeResolutionService } from '../services/dispute-resolution.service.js';

@ApiTags('Admin / Disputes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.ADMIN)
@Controller('admin/disputes')
export class AdminDisputesController {
  constructor(private readonly disputes: DisputeResolutionService) {}

  @Get()
  @ApiOperation({
    summary:
      'Listar disputas por no presentación del guía o inicio sin confirmar, las más antiguas primero',
  })
  @ApiOkResponse({ type: DisputePageDto })
  list(@Query() query: DisputeQueryDto): Promise<DisputePageDto> {
    return this.disputes.list(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Ver una disputa con la reconfirmación, el inicio de cada parte y la distancia del guía al punto de partida',
  })
  @ApiOkResponse({ type: DisputeDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<DisputeDto> {
    return this.disputes.get(id);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Resolver la disputa: el tour se hizo y se paga al guía, o el guía no se presentó, se reembolsa al turista y el guía recibe un strike grave',
  })
  @ApiOkResponse({ type: DisputeResolutionDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDisputeDto,
  ): Promise<DisputeResolutionDto> {
    return this.disputes.resolve(user.id, id, dto);
  }
}
