import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import {
  BookingStatus,
  DisputeDecision,
  DisputeParty,
  DisputeReason,
  DisputeStatus,
} from '../bookings.enums.js';
import { Dispute } from '../entities/dispute.entity.js';

export class GuideStartDto {
  @ApiProperty({ example: -16.3502, description: 'Ubicación actual del guía' })
  @Type(() => Number)
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: -67.9198 })
  @Type(() => Number)
  @IsLongitude()
  longitude: number;
}

export class NoShowReportDto {
  @ApiProperty({
    example: 'Esperamos una hora en el punto de partida y el guía no llegó.',
  })
  @IsString()
  @Length(10, 1000)
  description: string;
}

export class DisputeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DisputeStatus })
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;
}

export class DisputeDto {
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

  @ApiProperty({ format: 'uuid', nullable: true })
  guideProfileId: string | null;

  @ApiProperty({ example: 'Juan Mamani', nullable: true })
  guideName: string | null;

  @ApiProperty({ example: 'Ana Müller', nullable: true })
  touristName: string | null;

  @ApiProperty({ enum: DisputeReason })
  reason: DisputeReason;

  @ApiProperty({ enum: DisputeParty })
  openedBy: DisputeParty;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ nullable: true, description: 'Reconfirmación del guía' })
  reconfirmedAt: Date | null;

  @ApiProperty({ nullable: true })
  guideStartedAt: Date | null;

  @ApiProperty({
    example: 120,
    nullable: true,
    description:
      'Metros entre el guía y el punto de partida de la ruta cuando marcó el inicio',
  })
  guideStartDistanceM: number | null;

  @ApiProperty({ nullable: true })
  touristStartedAt: Date | null;

  @ApiProperty({ enum: DisputeStatus })
  status: DisputeStatus;

  @ApiProperty({ enum: DisputeDecision, nullable: true })
  decision: DisputeDecision | null;

  @ApiProperty({ nullable: true })
  resolution: string | null;

  @ApiProperty({ nullable: true })
  resolvedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(dispute: Dispute): DisputeDto {
    const booking = dispute.booking;
    const guide = booking.guideProfile?.user;
    const tourist = booking.tourist;
    return {
      id: dispute.id,
      bookingId: dispute.bookingId,
      bookingCode: booking.code,
      bookingStatus: booking.status,
      tourDate: booking.tourDate,
      startTime: booking.startTime,
      routeNameEs: booking.route?.nameEs ?? null,
      guideProfileId: booking.guideProfileId,
      guideName: guide ? `${guide.firstName} ${guide.lastName}` : null,
      touristName: tourist ? `${tourist.firstName} ${tourist.lastName}` : null,
      reason: dispute.reason,
      openedBy: dispute.openedBy,
      description: dispute.description,
      reconfirmedAt: booking.reconfirmedAt,
      guideStartedAt: booking.guideStartedAt,
      guideStartDistanceM: booking.guideStartDistanceM,
      touristStartedAt: booking.touristStartedAt,
      status: dispute.status,
      decision: dispute.decision,
      resolution: dispute.resolution,
      resolvedAt: dispute.resolvedAt,
      createdAt: dispute.createdAt,
    };
  }
}

export class DisputePageDto {
  @ApiProperty({ type: [DisputeDto] })
  data: DisputeDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
