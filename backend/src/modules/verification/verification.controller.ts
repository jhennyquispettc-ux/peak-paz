import { OutboxDeadLetters } from '@nestjs/outbox';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AllowUnverifiedEmail } from '../auth/decorators/allow-unverified-email.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { UserRole } from '../users/users.enums.js';
import { AccountVerificationService } from './verification.service.js';

class ConfirmEmailDto {
  @Matches(/^[a-f0-9]{64}$/) token: string;
}

@ApiTags('Account verification')
@ApiBearerAuth()
@AllowUnverifiedEmail()
@Controller('verification')
export class AccountVerificationController {
  constructor(
    private readonly verification: AccountVerificationService,
    private readonly deadLetters: OutboxDeadLetters,
  ) {}
  @Roles(UserRole.ADMIN)
  @Get('admin/delivery-failures')
  failures() {
    return this.deadLetters.list({ topic: 'account.verification' });
  }
  @Roles(UserRole.ADMIN)
  @Post('admin/delivery-failures/:id/retry')
  @HttpCode(200)
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.deadLetters.requeue([id]);
  }
  @Get('me')
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.verification.status(user.id);
  }
  @Post('email/resend')
  @HttpCode(200)
  resend(@CurrentUser() user: AuthenticatedUser) {
    return this.verification.resend(user.id);
  }
  @Public()
  @Post('email/confirm')
  @HttpCode(200)
  confirm(@Body() dto: ConfirmEmailDto) {
    return this.verification.confirm(dto.token);
  }
  @Roles(UserRole.ADMIN)
  @Get('admin/users/:id')
  adminStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.verification.status(id);
  }
}
