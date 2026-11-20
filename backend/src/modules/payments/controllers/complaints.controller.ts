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
  ApiBadGatewayResponse,
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
  ComplaintDto,
  ComplaintPageDto,
  ComplaintQueryDto,
  ComplaintResolutionDto,
  CreateComplaintDto,
  ResolveComplaintDto,
} from '../dto/complaint.dto.js';
import { ComplaintsService } from '../services/complaints.service.js';

@ApiTags('Complaints')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller()
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}

  @Post('bookings/:id/complaints')
  @Roles(UserRole.TOURIST)
  @ApiOperation({
    summary:
      'Reclamar por un tour completado, una vez y hasta 72 horas después. La liquidación del proveedor queda retenida',
  })
  @ApiCreatedResponse({ type: ComplaintDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  open(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateComplaintDto,
  ): Promise<ComplaintDto> {
    return this.complaints.open(user.id, id, dto.description);
  }

  @Get('bookings/:id/complaints')
  @Roles(UserRole.TOURIST)
  @ApiOperation({ summary: 'Ver mi reclamo de un tour y su resolución' })
  @ApiOkResponse({ type: ComplaintDto })
  getMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ComplaintDto> {
    return this.complaints.getForTourist(user.id, id);
  }

  @Get('admin/complaints')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar reclamos, los más antiguos primero' })
  @ApiOkResponse({ type: ComplaintPageDto })
  list(@Query() query: ComplaintQueryDto): Promise<ComplaintPageDto> {
    return this.complaints.list(query);
  }

  @Get('admin/complaints/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver un reclamo' })
  @ApiOkResponse({ type: ComplaintDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<ComplaintDto> {
    return this.complaints.get(id);
  }

  @Post('admin/complaints/:id/resolve')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Resolver el reclamo: rechazarlo, o aceptarlo con un reembolso del 0 al 100% descontado al proveedor y un strike opcional',
  })
  @ApiOkResponse({ type: ComplaintResolutionDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiBadGatewayResponse({ type: ErrorResponseDto })
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveComplaintDto,
  ): Promise<ComplaintResolutionDto> {
    return this.complaints.resolve(user.id, id, dto);
  }
}
