import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/users.enums.js';
import { DocumentReviewService } from './document-review.service.js';
import type { ReviewSubject } from './entities/document-review.entity.js';

const SUBJECTS = { GUIDE: 'GUIDE', AGENCY: 'AGENCY' } as const;

@ApiTags('Document review')
@Controller()
export class DocumentReviewController {
  constructor(private readonly reviews: DocumentReviewService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Último análisis automático de los documentos' })
  @Roles(UserRole.ADMIN)
  @Get('admin/document-reviews/:subject/:id')
  latest(
    @Param('subject', new ParseEnumPipe(SUBJECTS)) subject: ReviewSubject,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviews.latest(subject, id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Solicita un nuevo análisis de los documentos' })
  @Roles(UserRole.ADMIN)
  @Post('admin/document-reviews/:subject/:id')
  @HttpCode(202)
  request(
    @Param('subject', new ParseEnumPipe(SUBJECTS)) subject: ReviewSubject,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviews.request(subject, id);
  }

  @ApiExcludeEndpoint()
  @Public()
  @Get('internal/document-files/:token')
  async file(@Param('token') token: string): Promise<StreamableFile> {
    const opened = await this.reviews.openFile(token);
    return new StreamableFile(opened.stream, { type: opened.mimetype });
  }
}
