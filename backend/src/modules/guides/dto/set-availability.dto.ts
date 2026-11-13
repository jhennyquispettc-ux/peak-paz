import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { AvailabilitySlotDto } from './availability-slot.dto.js';

export class SetAvailabilityDto {
  @ApiProperty({
    type: [AvailabilitySlotDto],
    description:
      'Reemplaza todos los horarios. Un horario indica en qué rango puede empezar un tour',
  })
  @IsArray()
  @ArrayMaxSize(28)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[];
}
