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
import { laPazInstant } from '../../../common/time/la-paz-time.js';
import { CancellationReview } from '../entities/cancellation-review.entity.js';
import { SanctionLevel } from '../sanctions.js';
import {
  CancellationDecision,
  CancellationReviewStatus,
} from '../strikes.enums.js';
import { SanctionSubjectDto, StrikeDto, subjectOf } from './strike.dto.js';

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
    description:
      'Solo con STRIKE_AND_FINE. Porcentaje del monto pagado de la reserva o de la salida',
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

export class CancellationReviewDto extends SanctionSubjectDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Tengo fiebre y no puedo subir', nullable: true })
  cancellationReason: string | null;

  @ApiProperty()
  cancelledAt: Date;

  @ApiProperty({
    example: 30,
    nullable: true,
    description: 'Horas que faltaban para el inicio cuando se canceló',
  })
  hoursBeforeStart: number | null;

  @ApiProperty({
    example: 300,
    description:
      'Monto en bolivianos sobre el que se calcula la multa: la reserva, o lo pagado por los inscritos de la salida',
  })
  fineBaseAmount: number;

  @ApiProperty({ description: 'Se adjuntó un justificante' })
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
    const subject = subjectOf(review.booking, review.groupDeparture);
    const cancelledAt = review.booking?.cancelledAt ?? review.createdAt;
    const hoursBeforeStart =
      subject.tourDate && subject.startTime
        ? Math.floor(
            (laPazInstant(subject.tourDate, subject.startTime).getTime() -
              cancelledAt.getTime()) /
              MS_PER_HOUR,
          )
        : null;
    return Object.assign(subject, {
      id: review.id,
      cancellationReason:
        review.booking?.cancellationReason ?? review.reason ?? null,
      cancelledAt,
      hoursBeforeStart,
      fineBaseAmount: review.fineBaseAmount,
      hasEvidence: review.evidencePublicId !== null,
      status: review.status,
      decision: review.decision,
      fineAmount: review.fineAmount,
      fineSettled: review.fineSettled,
      resolution: review.resolution,
      resolvedAt: review.resolvedAt,
      createdAt: review.createdAt,
    });
  }
}

export class CancellationReviewDetailDto extends CancellationReviewDto {
  @ApiProperty({
    example: 1,
    description: 'Strikes activos que ya tiene el guía o la agencia',
  })
  activeStrikes: number;
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
