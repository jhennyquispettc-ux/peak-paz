import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { bookingStartsAt } from '../../bookings/booking-schedule.js';
import { BookingStatus } from '../../bookings/bookings.enums.js';
import { CancellationReview } from '../entities/cancellation-review.entity.js';
import { SanctionLevel } from '../sanctions.js';
import {
  CancellationDecision,
  CancellationReviewStatus,
} from '../strikes.enums.js';
import { guideNameOf, StrikeDto } from './strike.dto.js';

const MS_PER_HOUR = 60 * 60 * 1000;

export class CancellationReviewQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CancellationReviewStatus })
  @IsOptional()
  @IsEnum(CancellationReviewStatus)
  status?: CancellationReviewStatus;
}

export class ResolveCancellationDto {
  @ApiProperty({ enum: CancellationDecision })
  @IsEnum(CancellationDecision)
  decision: CancellationDecision;

  @ApiPropertyOptional({
    example: 20,
    minimum: 1,
    description: 'Solo con STRIKE_AND_FINE. Porcentaje del total de la reserva',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  finePercent?: number;

  @ApiProperty({
    example: 'Canceló un día antes sin presentar justificante.',
  })
  @IsString()
  @Length(5, 1000)
  resolution: string;
}

export class CancellationReviewDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ example: 'PP-7K3M9QX2' })
  bookingCode: string;

  @ApiProperty({ enum: BookingStatus })
  bookingStatus: BookingStatus;

  @ApiProperty({ example: '2026-12-05', nullable: true })
  tourDate: string | null;

  @ApiProperty({ example: '07:00:00', nullable: true })
  startTime: string | null;

  @ApiProperty({ nullable: true })
  routeNameEs: string | null;

  @ApiProperty({
    example: 300,
    description: 'Total de la reserva en bolivianos',
  })
  totalAmount: number;

  @ApiProperty({ format: 'uuid', nullable: true })
  guideProfileId: string | null;

  @ApiProperty({ example: 'Juan Mamani', nullable: true })
  guideName: string | null;

  @ApiProperty({ example: 'Tengo fiebre y no puedo subir', nullable: true })
  cancellationReason: string | null;

  @ApiProperty({ nullable: true })
  cancelledAt: Date | null;

  @ApiProperty({
    example: 30,
    nullable: true,
    description: 'Horas que faltaban para el inicio cuando el guía canceló',
  })
  hoursBeforeStart: number | null;

  @ApiProperty({ description: 'El guía adjuntó un justificante' })
  hasEvidence: boolean;

  @ApiProperty({ enum: CancellationReviewStatus })
  status: CancellationReviewStatus;

  @ApiProperty({ enum: CancellationDecision, nullable: true })
  decision: CancellationDecision | null;

  @ApiProperty({ example: 0 })
  fineAmount: number;

  @ApiProperty({ example: 0, description: 'Parte de la multa ya descontada' })
  fineSettled: number;

  @ApiProperty({ nullable: true })
  resolution: string | null;

  @ApiProperty({ nullable: true })
  resolvedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(review: CancellationReview): CancellationReviewDto {
    const booking = review.booking;
    const hoursBeforeStart =
      booking.cancelledAt && booking.tourDate
        ? Math.floor(
            (bookingStartsAt(booking).getTime() -
              booking.cancelledAt.getTime()) /
              MS_PER_HOUR,
          )
        : null;
    return {
      id: review.id,
      bookingId: review.bookingId,
      bookingCode: booking.code,
      bookingStatus: booking.status,
      tourDate: booking.tourDate,
      startTime: booking.startTime,
      routeNameEs: booking.route?.nameEs ?? null,
      totalAmount: booking.totalAmount,
      guideProfileId: booking.guideProfileId,
      guideName: guideNameOf(booking),
      cancellationReason: booking.cancellationReason,
      cancelledAt: booking.cancelledAt,
      hoursBeforeStart,
      hasEvidence: review.evidencePublicId !== null,
      status: review.status,
      decision: review.decision,
      fineAmount: review.fineAmount,
      fineSettled: review.fineSettled,
      resolution: review.resolution,
      resolvedAt: review.resolvedAt,
      createdAt: review.createdAt,
    };
  }
}

export class CancellationReviewDetailDto extends CancellationReviewDto {
  @ApiProperty({ example: 1, description: 'Strikes activos del guía hoy' })
  guideActiveStrikes: number;
}

export class CancellationReviewPageDto {
  @ApiProperty({ type: [CancellationReviewDto] })
  data: CancellationReviewDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class CancellationResolutionDto {
  @ApiProperty({ type: CancellationReviewDto })
  review: CancellationReviewDto;

  @ApiProperty({ type: StrikeDto, nullable: true })
  strike: StrikeDto | null;

  @ApiProperty({ example: 2 })
  activeStrikes: number;

  @ApiProperty({
    enum: SanctionLevel,
    description: 'NONE, HIDDEN si queda oculto, SUSPENDED si queda suspendido',
  })
  sanction: SanctionLevel;

  @ApiProperty({ nullable: true })
  hiddenUntil: Date | null;
}
