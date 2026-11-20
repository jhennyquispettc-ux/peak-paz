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
  ApiBadRequestResponse,
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
import { UserRole } from '../../users/users.enums.js';
import {
  CancellationResultDto,
  GuideCancellationDto,
  TouristCancellationDto,
} from '../dto/cancellation.dto.js';
import { BookingCancellationService } from '../services/booking-cancellation.service.js';

@ApiTags('Bookings')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@ApiConflictResponse({ type: ErrorResponseDto })
@ApiBadGatewayResponse({ type: ErrorResponseDto })
@Controller()
export class BookingCancellationController {
  constructor(private readonly cancellations: BookingCancellationService) {}

  @Post('bookings/:id/cancel')
  @Roles(UserRole.TOURIST)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Cancelar una reserva. Pagada con 7 días o más de anticipación se reembolsa el 100%',
  })
  @ApiOkResponse({ type: CancellationResultDto })
  cancelByTourist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TouristCancellationDto,
  ): Promise<CancellationResultDto> {
    return this.cancellations.cancelByTourist(user.id, id, dto.reason);
  }

  @Post('guides/me/bookings/:id/cancel')
  @Roles(UserRole.GUIDE)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('evidence', { limits: { fileSize: MAX_DOCUMENT_BYTES } }),
  )
  @ApiOperation({
    summary:
      'Cancelar una reserva aceptada o pagada con su motivo y un justificante opcional. El turista recibe el 100% si ya pagó y el administrador revisa la cancelación',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: { type: 'string', example: 'Tengo fiebre y no puedo subir' },
        weather: { type: 'boolean', default: false },
        evidence: {
          type: 'string',
          format: 'binary',
          description: 'Justificante opcional. PDF, JPG o PNG de hasta 5 MB',
        },
      },
    },
  })
  @ApiOkResponse({ type: CancellationResultDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  cancelByGuide(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GuideCancellationDto,
    @UploadedFile() evidence: UploadedFileData | undefined,
  ): Promise<CancellationResultDto> {
    return this.cancellations.cancelByGuide(
      user.id,
      id,
      dto.reason,
      dto.weather ?? false,
      evidence,
    );
  }
}
