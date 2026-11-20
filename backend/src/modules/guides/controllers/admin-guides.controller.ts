import { ApiFileResponse } from '../../../common/swagger/api-file-response.decorator.js';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { VerificationDecisionDto } from '../../../common/dto/verification-decision.dto.js';
import { VerificationQueryDto } from '../../../common/dto/verification-query.dto.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.js';
import { UserRole } from '../../users/users.enums.js';
import { GuideProfileDto } from '../dto/guide-profile.dto.js';
import {
  GuideRouteDecisionDto,
  GuideRouteRequestDto,
  GuideRouteRequestPageDto,
  GuideRouteRequestQueryDto,
} from '../dto/guide-route-request.dto.js';
import { GuidePageDto } from '../dto/guide-summary.dto.js';
import { GuideVerificationService } from '../services/guide-verification.service.js';

@ApiTags('Admin / Guides')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminGuidesController {
  constructor(private readonly verification: GuideVerificationService) {}

  @Get('guides')
  @ApiOperation({ summary: 'Listar guías por estado de verificación' })
  @ApiOkResponse({ type: GuidePageDto })
  list(@Query() query: VerificationQueryDto): Promise<GuidePageDto> {
    return this.verification.list(query);
  }

  @Get('guides/:id')
  @ApiOperation({ summary: 'Ver el perfil completo de un guía' })
  @ApiOkResponse({ type: GuideProfileDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<GuideProfileDto> {
    return this.verification.getById(id);
  }

  @Get('guides/:id/documents/:documentId/file')
  @ApiOperation({ summary: 'Ver un documento del guía' })
  @ApiFileResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<StreamableFile> {
    const file = await this.verification.openDocument(id, documentId);
    return new StreamableFile(file.stream, { type: file.mimetype });
  }

  @Patch('guides/:id/verification')
  @ApiOperation({ summary: 'Aprobar o rechazar a un guía' })
  @ApiOkResponse({ type: GuideProfileDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerificationDecisionDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<GuideProfileDto> {
    return this.verification.decide(id, dto, admin.id);
  }

  @Get('guide-routes')
  @ApiOperation({ summary: 'Listar pedidos de autorización por ruta' })
  @ApiOkResponse({ type: GuideRouteRequestPageDto })
  listRouteRequests(
    @Query() query: GuideRouteRequestQueryDto,
  ): Promise<GuideRouteRequestPageDto> {
    return this.verification.listRouteRequests(query);
  }

  @Patch('guide-routes/:id')
  @ApiOperation({ summary: 'Aprobar o rechazar a un guía para una ruta' })
  @ApiOkResponse({ type: GuideRouteRequestDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  decideRoute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuideRouteDecisionDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<GuideRouteRequestDto> {
    return this.verification.decideRoute(id, dto.status, admin.id);
  }
}
