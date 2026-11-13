import { ApiProperty } from '@nestjs/swagger';
import { AvailabilitySlotDto } from './availability-slot.dto.js';
import { BlockedDateDto } from './blocked-date.dto.js';

export class GuideScheduleDto {
  @ApiProperty({ type: [AvailabilitySlotDto] })
  slots: AvailabilitySlotDto[];

  @ApiProperty({ type: [BlockedDateDto] })
  blockedDates: BlockedDateDto[];
}
