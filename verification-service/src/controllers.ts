import { OutboxDeadLetters } from '@nestjs/outbox';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  ConfirmEmailDto,
  DecideReviewDto,
  OpenCaseDto,
  SubmitReviewDto,
} from './dto.js';
import { InternalGuard } from './internal.guard.js';
import { VerificationService } from './verification.service.js';

@Controller('internal')
@UseGuards(InternalGuard)
export class VerificationController {
  constructor(
    private readonly service: VerificationService,
    private readonly deadLetters: OutboxDeadLetters,
  ) {}
  @Get('delivery-failures') failures() {
    return this.deadLetters.list({ topic: 'verification.email' });
  }
  @Post('delivery-failures/:id/retry')
  @HttpCode(200)
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.deadLetters.requeue([id]);
  }
  @Post('cases') open(@Body() dto: OpenCaseDto) {
    return this.service.open(dto);
  }
  @Get('cases/:id') status(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.status(id);
  }
  @Post('cases/:id/resend')
  @HttpCode(200)
  resend(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.resend(id);
  }
  @Post('email/confirm')
  @HttpCode(200)
  confirm(@Body() dto: ConfirmEmailDto) {
    return this.service.confirm(dto.token);
  }
  @Post('cases/:id/reviews')
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitReviewDto,
    @Query('resubmit') resubmit?: string,
  ) {
    return this.service.submit(id, dto, resubmit === 'true');
  }
  @Post('cases/:id/reviews/:reviewId/decision')
  @HttpCode(200)
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() dto: DecideReviewDto,
  ) {
    return this.service.decide(id, reviewId, dto);
  }
}

@Controller('health')
export class HealthController {
  constructor(private readonly db: DataSource) {}
  @Get() async health() {
    await this.db.query('SELECT 1');
    return { status: 'ok' };
  }
}
