import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { GroupDeparture } from '../../group-departures/entities/group-departure.entity.js';
import { Strike } from '../entities/strike.entity.js';
import { ProviderKind } from '../sanctions.js';
import { StrikeReason, StrikeStatus } from '../strikes.enums.js';

export interface SanctionSubject {
  providerKind: ProviderKind;
  bookingId: string | null;
  bookingCode: string | null;
  groupDepartureId: string | null;
  tourDate: string | null;
  startTime: string | null;
  routeNameEs: string | null;
  guideProfileId: string | null;
  guideName: string | null;
  agencyId: string | null;
  agencyName: string | null;
}

export function subjectOf(
  booking: Booking | null | undefined,
  departure: GroupDeparture | null | undefined,
): SanctionSubject {
  const guideUser = booking?.guideProfile?.user;
  return {
    providerKind: departure ? ProviderKind.AGENCY : ProviderKind.GUIDE,
    bookingId: booking?.id ?? null,
    bookingCode: booking?.code ?? null,
    groupDepartureId: departure?.id ?? null,
    tourDate: booking?.tourDate ?? departure?.departureDate ?? null,
    startTime: booking?.startTime ?? departure?.meetingTime ?? null,
    routeNameEs: (booking?.route ?? departure?.route)?.nameEs ?? null,
    guideProfileId: booking?.guideProfileId ?? null,
    guideName: guideUser
      ? `${guideUser.firstName} ${guideUser.lastName}`
      : null,
    agencyId: departure?.agencyId ?? null,
    agencyName: departure?.agency?.legalName ?? null,
  };
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

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  agencyId?: string;
}

export class SanctionSubjectDto {
  @ApiProperty({
    enum: ProviderKind,
    description:
      'GUIDE para reservas particulares, AGENCY para salidas grupales',
  })
  providerKind: ProviderKind;

  @ApiProperty({ format: 'uuid', nullable: true })
  bookingId: string | null;

  @ApiProperty({ example: 'PP-7K3M9QX2', nullable: true })
  bookingCode: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  groupDepartureId: string | null;

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

  @ApiProperty({ format: 'uuid', nullable: true })
  agencyId: string | null;

  @ApiProperty({ example: 'Andes Trek SRL', nullable: true })
  agencyName: string | null;
}

export class StrikeDto extends SanctionSubjectDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: StrikeReason })
  reason: StrikeReason;

  @ApiProperty({ enum: StrikeStatus })
  status: StrikeStatus;

  @ApiProperty({ example: 1, description: 'Una no presentación cuenta como 2' })
  weight: number;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(strike: Strike): StrikeDto {
    return Object.assign(subjectOf(strike.booking, strike.groupDeparture), {
      id: strike.id,
      reason: strike.reason,
      status: strike.status,
      weight: strike.weight,
      expiresAt: strike.expiresAt,
      createdAt: strike.createdAt,
    });
  }
}

export class StrikePageDto {
  @ApiProperty({ type: [StrikeDto] })
  data: StrikeDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class SanctionsSummaryDto {
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
