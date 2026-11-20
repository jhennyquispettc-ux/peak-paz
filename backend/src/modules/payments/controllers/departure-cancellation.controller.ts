import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import type { UploadedFileData } from '../../../common/types/uploaded-file.js';
import { MAX_DOCUMENT_BYTES } from '../../../common/verification/verification-documents.js';
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
  @UseInterceptors(
    FileInterceptor('evidence', { limits: { fileSize: MAX_DOCUMENT_BYTES } }),
  )
  @ApiOperation({
    summary:
      'Cancelar una salida con su motivo y un justificante opcional. Todos los inscritos que pagaron reciben el 100% y el administrador revisa la cancelación',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: { type: 'string', example: 'Derrumbe en el camino de acceso' },
        weather: { type: 'boolean', default: false },
        evidence: {
          type: 'string',
          format: 'binary',
          description: 'Justificante opcional. PDF, JPG o PNG de hasta 5 MB',
        },
      },
    },
  })
  @ApiOkResponse({ type: AgencyDepartureDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiBadGatewayResponse({ type: ErrorResponseDto })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuideCancellationDto,
    @UploadedFile() evidence: UploadedFileData | undefined,
  ): Promise<AgencyDepartureDto> {
    return this.lifecycle.cancelByAgency(
      user.id,
      id,
      dto.reason,
      dto.weather ?? false,
      evidence,
    );
  }
}
