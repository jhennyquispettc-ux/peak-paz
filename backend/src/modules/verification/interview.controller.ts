import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowUnverifiedEmail } from '../auth/decorators/allow-unverified-email.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { UserRole } from '../users/users.enums.js';
import {
  RecordInterviewDto,
  ScheduleInterviewDto,
} from './dto/interview.dto.js';
import type { ReviewSubject } from './entities/document-review.entity.js';
import { InterviewService } from './interview.service.js';

const SUBJECTS = { GUIDE: 'GUIDE', AGENCY: 'AGENCY' } as const;

@ApiTags('Provider interviews')
@ApiBearerAuth()
@Controller()
export class InterviewController {
  constructor(private readonly interviews: InterviewService) {}

  @ApiOperation({ summary: 'Próxima entrevista del proveedor' })
  @Roles(UserRole.GUIDE, UserRole.AGENCY)
  @AllowUnverifiedEmail()
  @Get('interviews/me')
  mine(@CurrentUser() user: AuthenticatedUser) {
    return this.interviews.mine(user.id);
  }

  @ApiOperation({ summary: 'Entrevistas del proveedor y si se puede aprobar' })
  @Roles(UserRole.ADMIN)
  @Get('admin/interviews/:subject/:id')
  overview(
    @Param('subject', new ParseEnumPipe(SUBJECTS)) subject: ReviewSubject,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.interviews.overview(subject, id);
  }

  @ApiOperation({ summary: 'Agendar una entrevista y avisar al proveedor' })
  @Roles(UserRole.ADMIN)
  @Post('admin/interviews/:subject/:id')
  schedule(
    @Param('subject', new ParseEnumPipe(SUBJECTS)) subject: ReviewSubject,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleInterviewDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.interviews.schedule(subject, id, dto, admin.id);
  }

  @ApiOperation({ summary: 'Registrar el resultado de la entrevista' })
  @Roles(UserRole.ADMIN)
  @Patch('admin/interviews/:id/result')
  record(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordInterviewDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.interviews.record(id, dto, admin.id);
  }

  @ApiOperation({ summary: 'Cancelar una entrevista agendada' })
  @Roles(UserRole.ADMIN)
  @Post('admin/interviews/:id/cancel')
  @HttpCode(200)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.interviews.cancel(id, admin.id);
  }
}
