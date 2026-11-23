import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/users.enums.js';
import { MessagingPingDto, MessagingStatusDto } from './messaging.dto.js';
import { MessagingService } from './messaging.service.js';

@ApiTags('Admin / Messaging')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.ADMIN)
@Controller('admin/messaging')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('status')
  @ApiOperation({ summary: 'Ver si el backend está conectado a RabbitMQ' })
  @ApiOkResponse({ type: MessagingStatusDto })
  status(): MessagingStatusDto {
    return this.messaging.status();
  }

  @Post('ping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Probar la comunicación con el microservicio Python por RabbitMQ',
  })
  @ApiOkResponse({ type: MessagingPingDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  ping(): Promise<MessagingPingDto> {
    return this.messaging.ping();
  }
}
