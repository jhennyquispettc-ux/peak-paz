import { ApiProperty } from '@nestjs/swagger';
import { PointOfInterestType } from '../routes.enums.js';

export class ItineraryStopDto {
  @ApiProperty()
  stageOrder: number;

  @ApiProperty()
  dayNumber: number;

  @ApiProperty({ enum: PointOfInterestType })
  type: PointOfInterestType;

  @ApiProperty()
  nameEs: string;

  @ApiProperty()
  nameEn: string;

  @ApiProperty()
  minutesFromPrevious: number;

  @ApiProperty({ example: '09:30' })
  arrivalTime: string;

  @ApiProperty()
  isOvernight: boolean;
}

export class ItineraryDayDto {
  @ApiProperty()
  dayNumber: number;

  @ApiProperty({ example: '07:00' })
  startTime: string;

  @ApiProperty({ example: '15:30' })
  endTime: string;

  @ApiProperty({ example: 510 })
  walkingMinutes: number;
}

export class ItineraryDto {
  @ApiProperty({ format: 'uuid' })
  routeId: string;

  @ApiProperty({ example: '07:00' })
  startTime: string;

  @ApiProperty({ example: '06:00' })
  suggestedStartFrom: string;

  @ApiProperty({ example: '08:00' })
  suggestedStartTo: string;

  @ApiProperty({ type: [ItineraryDayDto] })
  days: ItineraryDayDto[];

  @ApiProperty({ type: [ItineraryStopDto] })
  stops: ItineraryStopDto[];
}
