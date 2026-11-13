import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601 } from 'class-validator';
import { CommitmentDto } from '../../guides/dto/commitment.dto.js';
import { AvailabilityMode } from '../../guides/guides.enums.js';
import { BookingStatus } from '../bookings.enums.js';

export class GuideAgendaQueryDto {
  @ApiProperty({ example: '2026-12-01' })
  @IsISO8601({ strict: true })
  from: string;

  @ApiProperty({
    example: '2026-12-31',
    description: 'Hasta 62 días después de from',
  })
  @IsISO8601({ strict: true })
  to: string;
}

export class AgendaWindowDto {
  @ApiProperty({ example: '2026-12-05' })
  date: string;

  @ApiProperty({ example: '06:00' })
  timeFrom: string;

  @ApiProperty({ example: '09:00' })
  timeTo: string;
}

export class AgendaBookingDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'PP-7K3M9QX2' })
  code: string;

  @ApiProperty({ enum: BookingStatus })
  status: BookingStatus;

  @ApiProperty()
  routeNameEs: string;

  @ApiProperty()
  peopleCount: number;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;
}

export class GuideAgendaDto {
  @ApiProperty({ enum: AvailabilityMode })
  mode: AvailabilityMode;

  @ApiProperty({ example: '2026-12-01' })
  from: string;

  @ApiProperty({ example: '2026-12-31' })
  to: string;

  @ApiProperty({
    example: 120,
    description: 'Margen entre compromisos en minutos',
  })
  bufferMinutes: number;

  @ApiProperty({
    type: [AgendaWindowDto],
    description: 'Horarios en que el guía puede empezar un tour',
  })
  availableWindows: AgendaWindowDto[];

  @ApiProperty({ type: [CommitmentDto] })
  commitments: CommitmentDto[];

  @ApiProperty({
    type: [AgendaBookingDto],
    description: 'Solicitudes y reservas de Peak Paz',
  })
  bookings: AgendaBookingDto[];
}
