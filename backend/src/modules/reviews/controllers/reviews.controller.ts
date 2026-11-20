import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
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
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Public } from '../../auth/decorators/public.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.js';
import { UserRole } from '../../users/users.enums.js';
import {
  AdminReviewDto,
  AdminReviewPageDto,
  AdminReviewQueryDto,
  CreateReviewDto,
  ReviewDto,
  ReviewPageDto,
  ReviewVisibilityDto,
} from '../dto/review.dto.js';
import { ReviewsService } from '../services/reviews.service.js';

@ApiTags('Reviews')
@ApiNotFoundResponse({ type: ErrorResponseDto })
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post('bookings/:id/review')
  @Roles(UserRole.TOURIST)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Calificar un tour completado de 1 a 5, una sola vez y hasta 30 días después',
  })
  @ApiCreatedResponse({ type: ReviewDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewDto> {
    return this.reviews.create(user.id, id, dto);
  }

  @Get('bookings/:id/review')
  @Roles(UserRole.TOURIST)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ver mi reseña de un tour' })
  @ApiOkResponse({ type: ReviewDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  getMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReviewDto> {
    return this.reviews.getForTourist(user.id, id);
  }

  @Get('guides/:id/reviews')
  @Public()
  @ApiOperation({
    summary: 'Reseñas visibles de un guía, las más recientes primero',
  })
  @ApiOkResponse({ type: ReviewPageDto })
  listForGuide(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<ReviewPageDto> {
    return this.reviews.listForGuide(id, query);
  }

  @Get('agencies/:id/reviews')
  @Public()
  @ApiOperation({
    summary: 'Reseñas visibles de una agencia, las más recientes primero',
  })
  @ApiOkResponse({ type: ReviewPageDto })
  listForAgency(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<ReviewPageDto> {
    return this.reviews.listForAgency(id, query);
  }

  @Get('admin/reviews')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todas las reseñas, visibles u ocultas' })
  @ApiOkResponse({ type: AdminReviewPageDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  listForAdmin(
    @Query() query: AdminReviewQueryDto,
  ): Promise<AdminReviewPageDto> {
    return this.reviews.listForAdmin(query);
  }

  @Patch('admin/reviews/:id/visibility')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Ocultar o volver a mostrar una reseña. El promedio del guía o la agencia se recalcula',
  })
  @ApiOkResponse({ type: AdminReviewDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  setVisibility(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewVisibilityDto,
  ): Promise<AdminReviewDto> {
    return this.reviews.setVisibility(user.id, id, dto);
  }
}
