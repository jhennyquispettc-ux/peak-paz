import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { Strike } from '../entities/strike.entity.js';
import { StrikeReason, StrikeStatus } from '../strikes.enums.js';

export function guideNameOf(booking: Booking | undefined): string | null {
  const user = booking?.guideProfile?.user;
  return user ? `${user.firstName} ${user.lastName}` : null;
}

export class StrikeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: StrikeStatus })
  @IsOptional()
  @IsEnum(StrikeStatus)
  status?: StrikeStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  guideProfileId?: string;
}

export class StrikeDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ example: 'PP-7K3M9QX2' })
  bookingCode: string;

  @ApiProperty({ example: '2026-12-05', nullable: true })
  tourDate: string | null;

  @ApiProperty({ nullable: true })
  routeNameEs: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  guideProfileId: string | null;

  @ApiProperty({ example: 'Juan Mamani', nullable: true })
  guideName: string | null;

  @ApiProperty({ enum: StrikeReason })
  reason: StrikeReason;

  @ApiProperty({ enum: StrikeStatus })
  status: StrikeStatus;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(strike: Strike): StrikeDto {
    return {
      id: strike.id,
      bookingId: strike.bookingId,
      bookingCode: strike.booking?.code,
      tourDate: strike.booking?.tourDate ?? null,
      routeNameEs: strike.booking?.route?.nameEs ?? null,
      guideProfileId: strike.booking?.guideProfileId ?? null,
      guideName: guideNameOf(strike.booking),
      reason: strike.reason,
      status: strike.status,
      expiresAt: strike.expiresAt,
      createdAt: strike.createdAt,
    };
  }
}

export class StrikePageDto {
  @ApiProperty({ type: [StrikeDto] })
  data: StrikeDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class GuideSanctionsDto {
  @ApiProperty({ example: 1, description: 'Strikes activos y sin vencer' })
  activeStrikes: number;

  @ApiProperty({ example: 2 })
  strikesToHide: number;

  @ApiProperty({ example: 3 })
  strikesToSuspend: number;

  @ApiProperty({
    nullable: true,
    description: 'Fecha hasta la que el perfil no aparece en el catálogo',
  })
  hiddenUntil: Date | null;

  @ApiProperty({
    example: 30,
    description: 'Multas en bolivianos que todavía se descontarán',
  })
  pendingFines: number;

  @ApiProperty({ type: [StrikeDto] })
  strikes: StrikeDto[];
}
