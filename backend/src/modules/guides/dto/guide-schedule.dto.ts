import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AvailabilityMode } from '../guides.enums.js';
import { AvailabilitySlotDto } from './availability-slot.dto.js';
import { AvailableDateDto } from './available-date.dto.js';
import { CommitmentDto } from './commitment.dto.js';

export class SetAvailabilityModeDto {
  @ApiProperty({
    enum: AvailabilityMode,
    description:
      'WEEKLY usa los horarios semanales. BY_DATE usa solo las fechas disponibles',
  })
  @IsEnum(AvailabilityMode)
  mode: AvailabilityMode;
}

export class GuideScheduleDto {
  @ApiProperty({ enum: AvailabilityMode })
  mode: AvailabilityMode;

  @ApiProperty({ type: [AvailabilitySlotDto] })
  slots: AvailabilitySlotDto[];

  @ApiProperty({
    type: [AvailableDateDto],
    description: 'Fechas disponibles desde hoy',
  })
  availableDates: AvailableDateDto[];

  @ApiProperty({
    type: [CommitmentDto],
    description: 'Compromisos que todavía no terminaron',
  })
  commitments: CommitmentDto[];
}
