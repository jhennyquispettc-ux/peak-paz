import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { ProviderKind } from '../../strikes/sanctions.js';
import { Review } from '../entities/review.entity.js';

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    example: 'Rosa conoce cada tramo del camino y nos cuidó con la altura.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 1000)
  comment?: string;
}

export class AdminReviewQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'true solo ocultas, false solo visibles',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  hidden?: boolean;
}

export class ReviewVisibilityDto {
  @ApiProperty({ description: 'true oculta la reseña del público' })
  @IsBoolean()
  hidden: boolean;

  @ApiPropertyOptional({
    example: 'Contiene insultos y datos personales del guía.',
    description: 'Obligatorio al ocultar',
  })
  @IsOptional()
  @IsString()
  @Length(5, 500)
  reason?: string;
}

export class ReviewDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiProperty({ nullable: true })
  comment: string | null;

  @ApiProperty({ example: 'Ana', nullable: true })
  touristFirstName: string | null;

  @ApiProperty({ example: 'CH', nullable: true })
  touristCountry: string | null;

  @ApiProperty({ nullable: true })
  routeNameEs: string | null;

  @ApiProperty({ example: '2026-12-05', nullable: true })
  tourDate: string | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(review: Review): ReviewDto {
    const booking = review.booking;
    const departure = booking?.groupDeparture;
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      touristFirstName: booking?.tourist?.firstName ?? null,
      touristCountry: booking?.tourist?.country ?? null,
      routeNameEs: (booking?.route ?? departure?.route)?.nameEs ?? null,
      tourDate: booking?.tourDate ?? departure?.departureDate ?? null,
      createdAt: review.createdAt,
    };
  }
}

export class AdminReviewDto extends ReviewDto {
  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ enum: ProviderKind })
  providerKind: ProviderKind;

  @ApiProperty({ nullable: true })
  guideName: string | null;

  @ApiProperty({ nullable: true })
  agencyName: string | null;

  @ApiProperty({ nullable: true })
  hiddenAt: Date | null;

  @ApiProperty({ nullable: true })
  hiddenReason: string | null;

  static fromReview(review: Review): AdminReviewDto {
    const booking = review.booking;
    const guide = booking.guideProfile?.user;
    return Object.assign(ReviewDto.fromEntity(review), {
      bookingId: review.bookingId,
      providerKind: booking.groupDepartureId
        ? ProviderKind.AGENCY
        : ProviderKind.GUIDE,
      guideName: guide ? `${guide.firstName} ${guide.lastName}` : null,
      agencyName: booking.groupDeparture?.agency?.legalName ?? null,
      hiddenAt: review.hiddenAt,
      hiddenReason: review.hiddenReason,
    });
  }
}

export class ReviewPageDto {
  @ApiProperty({ type: [ReviewDto] })
  data: ReviewDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class AdminReviewPageDto {
  @ApiProperty({ type: [AdminReviewDto] })
  data: AdminReviewDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
