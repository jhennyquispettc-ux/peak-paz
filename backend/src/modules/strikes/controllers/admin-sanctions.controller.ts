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
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.js';
import { UserRole } from '../../users/users.enums.js';
import {
  CancellationResolutionDto,
  CancellationReviewDetailDto,
  CancellationReviewPageDto,
  CancellationReviewQueryDto,
  ResolveCancellationDto,
} from '../dto/cancellation-review.dto.js';
import { StrikeDto, StrikePageDto, StrikeQueryDto } from '../dto/strike.dto.js';
import { CancellationReviewsService } from '../services/cancellation-reviews.service.js';
import { StrikesService } from '../services/strikes.service.js';

@ApiTags('Admin / Sanctions')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@ApiForbiddenResponse({ type: ErrorResponseDto })
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminSanctionsController {
  constructor(
    private readonly reviews: CancellationReviewsService,
    private readonly strikes: StrikesService,
  ) {}

  @Get('cancellation-reviews')
  @ApiOperation({
    summary:
      'Listar las cancelaciones de guías para revisar, las más antiguas primero',
  })
  @ApiOkResponse({ type: CancellationReviewPageDto })
  listReviews(
    @Query() query: CancellationReviewQueryDto,
  ): Promise<CancellationReviewPageDto> {
    return this.reviews.list(query);
  }

  @Get('cancellation-reviews/:id')
  @ApiOperation({
    summary: 'Ver una cancelación con los strikes activos que ya tiene el guía',
  })
  @ApiOkResponse({ type: CancellationReviewDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  getReview(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CancellationReviewDetailDto> {
    return this.reviews.get(id);
  }

  @Get('cancellation-reviews/:id/evidence')
  @ApiOperation({ summary: 'Ver el justificante que adjuntó el guía' })
  @ApiProduces('application/pdf', 'image/jpeg', 'image/png')
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  async downloadEvidence(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const file = await this.reviews.openEvidence(id);
    return new StreamableFile(file.stream, { type: file.mimetype });
  }

  @Post('cancellation-reviews/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Decidir la sanción: sin sanción, strike, o strike con multa descontada de la próxima liquidación',
  })
  @ApiOkResponse({ type: CancellationResolutionDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveCancellationDto,
  ): Promise<CancellationResolutionDto> {
    return this.reviews.resolve(user.id, id, dto);
  }

  @Get('strikes')
  @ApiOperation({ summary: 'Listar strikes, por guía o por estado' })
  @ApiOkResponse({ type: StrikePageDto })
  listStrikes(@Query() query: StrikeQueryDto): Promise<StrikePageDto> {
    return this.strikes.list(query);
  }

  @Post('strikes/:id/revert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Anular un strike activo. No levanta el ocultamiento ni la suspensión ya aplicados',
  })
  @ApiOkResponse({ type: StrikeDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  revert(@Param('id', ParseUUIDPipe) id: string): Promise<StrikeDto> {
    return this.strikes.revert(id);
  }
}
