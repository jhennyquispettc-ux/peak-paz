import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
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
import { UserRole } from '../../users/users.enums.js';
import { CancellationResultDto } from '../dto/cancellation.dto.js';
import { RescheduleRejectionService } from '../services/reschedule-rejection.service.js';

@ApiTags('Date changes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.TOURIST)
@Controller('bookings/:id/reschedules')
export class RescheduleRejectionController {
  constructor(private readonly rejections: RescheduleRejectionService) {}

  @Post(':rescheduleId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Rechazar la nueva fecha. La reserva se cancela con reembolso del 100% y el administrador revisa la cancelación del guía',
  })
  @ApiOkResponse({ type: CancellationResultDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiBadGatewayResponse({ type: ErrorResponseDto })
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('rescheduleId', ParseUUIDPipe) rescheduleId: string,
  ): Promise<CancellationResultDto> {
    return this.rejections.reject(user.id, id, rescheduleId);
  }
}
