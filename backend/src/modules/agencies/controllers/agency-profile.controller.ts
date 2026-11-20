import { ApiFileResponse } from '../../../common/swagger/api-file-response.decorator.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { VerificationDocumentDto } from '../../../common/dto/verification-document.dto.js';
import type { UploadedFileData } from '../../../common/types/uploaded-file.js';
import {
  documentUploadSchema,
  MAX_DOCUMENT_BYTES,
} from '../../../common/verification/verification-documents.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.js';
import { UserRole } from '../../users/users.enums.js';
import { AgencyDocumentType } from '../agencies.enums.js';
import { AgencyDto } from '../dto/agency.dto.js';
import { UpdateAgencyDto } from '../dto/update-agency.dto.js';
import { UploadAgencyDocumentDto } from '../dto/upload-agency-document.dto.js';
import { AgencyProfilesService } from '../services/agency-profiles.service.js';

@ApiTags('Agencies / Own profile')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.AGENCY)
@Controller('agencies/me')
export class AgencyProfileController {
  constructor(private readonly profiles: AgencyProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'Datos y documentos de la agencia' })
  @ApiOkResponse({ type: AgencyDto })
  getMine(@CurrentUser() user: AuthenticatedUser): Promise<AgencyDto> {
    return this.profiles.getMine(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Editar los datos de la agencia' })
  @ApiOkResponse({ type: AgencyDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAgencyDto,
  ): Promise<AgencyDto> {
    return this.profiles.updateMine(user.id, dto);
  }

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } }),
  )
  @ApiOperation({
    summary: 'Subir un documento. Reemplaza al anterior del mismo tipo',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: documentUploadSchema(Object.values(AgencyDocumentType)) })
  @ApiCreatedResponse({ type: VerificationDocumentDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  uploadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadAgencyDocumentDto,
    @UploadedFile() file: UploadedFileData | undefined,
  ): Promise<VerificationDocumentDto> {
    return this.profiles.uploadDocument(user.id, dto, file);
  }

  @Get('documents/:documentId/file')
  @ApiOperation({ summary: 'Descargar un documento propio' })
  @ApiFileResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async downloadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<StreamableFile> {
    const file = await this.profiles.openDocument(user.id, documentId);
    return new StreamableFile(file.stream, { type: file.mimetype });
  }

  @Delete('documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un documento propio' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  removeDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<void> {
    return this.profiles.removeDocument(user.id, documentId);
  }

  @Post('verification-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pedir una nueva revisión después de un rechazo' })
  @ApiOkResponse({ type: AgencyDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  requestReview(@CurrentUser() user: AuthenticatedUser): Promise<AgencyDto> {
    return this.profiles.requestReview(user.id);
  }
}
