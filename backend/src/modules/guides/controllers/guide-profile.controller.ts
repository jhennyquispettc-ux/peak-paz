import { AllowUnverifiedEmail } from '../../auth/decorators/allow-unverified-email.decorator.js';
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
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
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
import { GuideDocumentType } from '../guides.enums.js';
import { GuideProfileDto } from '../dto/guide-profile.dto.js';
import { GuideRouteDto } from '../dto/guide-route.dto.js';
import { RequestGuideRouteDto } from '../dto/request-guide-route.dto.js';
import { UpdateGuideProfileDto } from '../dto/update-guide-profile.dto.js';
import { UploadGuideDocumentDto } from '../dto/upload-guide-document.dto.js';
import { GuideProfilesService } from '../services/guide-profiles.service.js';

@ApiTags('Guides / Own profile')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.GUIDE)
@AllowUnverifiedEmail()
@Controller('guides/me')
export class GuideProfileController {
  constructor(private readonly profiles: GuideProfilesService) {}

  @Get()
  @ApiOperation({ summary: 'Perfil, documentos y rutas del guía' })
  @ApiOkResponse({ type: GuideProfileDto })
  getMine(@CurrentUser() user: AuthenticatedUser): Promise<GuideProfileDto> {
    return this.profiles.getMine(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Editar el perfil del guía' })
  @ApiOkResponse({ type: GuideProfileDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateGuideProfileDto,
  ): Promise<GuideProfileDto> {
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
  @ApiBody({ schema: documentUploadSchema(Object.values(GuideDocumentType)) })
  @ApiCreatedResponse({ type: VerificationDocumentDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  uploadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadGuideDocumentDto,
    @UploadedFile() file: UploadedFileData | undefined,
  ): Promise<VerificationDocumentDto> {
    return this.profiles.uploadDocument(user.id, dto, file);
  }

  @Get('documents/:documentId/file')
  @ApiOperation({ summary: 'Descargar un documento propio' })
  @ApiProduces('application/pdf', 'image/jpeg', 'image/png')
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
  @ApiOkResponse({ type: GuideProfileDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  requestReview(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<GuideProfileDto> {
    return this.profiles.requestReview(user.id);
  }

  @Post('routes')
  @ApiOperation({ summary: 'Pedir autorización para guiar una ruta' })
  @ApiCreatedResponse({ type: GuideRouteDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  requestRoute(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestGuideRouteDto,
  ): Promise<GuideRouteDto> {
    return this.profiles.requestRoute(user.id, dto.routeId);
  }

  @Delete('routes/:routeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirar una ruta de las que ofrece el guía' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  withdrawRoute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('routeId', ParseUUIDPipe) routeId: string,
  ): Promise<void> {
    return this.profiles.withdrawRoute(user.id, routeId);
  }
}
