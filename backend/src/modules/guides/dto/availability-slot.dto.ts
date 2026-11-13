import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Matches, Max, Min } from 'class-validator';
import { GuideAvailability } from '../entities/guide-availability.entity.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class AvailabilitySlotDto {
  @ApiProperty({
    example: 6,
    minimum: 0,
    maximum: 6,
    description: '0 es domingo, 1 lunes y así hasta 6 sábado',
  })
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @ApiProperty({ example: '05:00' })
  @Matches(TIME_PATTERN, { message: 'timeFrom must use HH:mm' })
  timeFrom: string;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_PATTERN, { message: 'timeTo must use HH:mm' })
  timeTo: string;

  static fromEntity(slot: GuideAvailability): AvailabilitySlotDto {
    return {
      weekday: slot.weekday,
      timeFrom: slot.timeFrom.slice(0, 5),
      timeTo: slot.timeTo.slice(0, 5),
    };
  }
}
