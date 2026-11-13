import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
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
import { PayoutDto, PayoutPageDto, PayoutQueryDto } from '../dto/payout.dto.js';
import { PayoutsService } from '../services/payouts.service.js';

@ApiTags('Payouts')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Controller()
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Get('guides/me/payouts')
  @Roles(UserRole.GUIDE)
  @ApiOperation({ summary: 'Liquidaciones del guía' })
  @ApiOkResponse({ type: PayoutPageDto })
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PayoutQueryDto,
  ): Promise<PayoutPageDto> {
    return this.payouts.listForGuide(user.id, query);
  }

  @Get('admin/payouts')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Liquidaciones pendientes y pagadas' })
  @ApiOkResponse({ type: PayoutPageDto })
  listAll(@Query() query: PayoutQueryDto): Promise<PayoutPageDto> {
    return this.payouts.listAll(query);
  }

  @Patch('admin/payouts/:id/paid')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Marcar una liquidación como pagada por transferencia',
  })
  @ApiOkResponse({ type: PayoutDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  markPaid(@Param('id', ParseUUIDPipe) id: string): Promise<PayoutDto> {
    return this.payouts.markPaid(id);
  }
}
