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
import { AgencyDto, AgencyPageDto } from '../dto/agency.dto.js';
import { AgencyVerificationService } from '../services/agency-verification.service.js';

@ApiTags('Admin / Agencies')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.ADMIN)
@Controller('admin/agencies')
export class AdminAgenciesController {
  constructor(private readonly verification: AgencyVerificationService) {}

  @Get()
  @ApiOperation({ summary: 'Listar agencias por estado de verificación' })
  @ApiOkResponse({ type: AgencyPageDto })
  list(@Query() query: VerificationQueryDto): Promise<AgencyPageDto> {
    return this.verification.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver los datos completos de una agencia' })
  @ApiOkResponse({ type: AgencyDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<AgencyDto> {
    return this.verification.getById(id);
  }

  @Get(':id/documents/:documentId/file')
  @ApiOperation({ summary: 'Ver un documento de la agencia' })
  @ApiFileResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<StreamableFile> {
    const file = await this.verification.openDocument(id, documentId);
    return new StreamableFile(file.stream, { type: file.mimetype });
  }

  @Patch(':id/verification')
  @ApiOperation({ summary: 'Aprobar o rechazar a una agencia' })
  @ApiOkResponse({ type: AgencyDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerificationDecisionDto,
    @CurrentUser() admin: AuthenticatedUser,
  ): Promise<AgencyDto> {
    return this.verification.decide(id, dto, admin.id);
  }
}
