import { ApiProperty } from '@nestjs/swagger';
import { PointOfInterest } from '../entities/point-of-interest.entity.js';
import { PointOfInterestType } from '../routes.enums.js';

export class PointOfInterestDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: PointOfInterestType })
  type: PointOfInterestType;

  @ApiProperty()
  nameEs: string;

  @ApiProperty()
  nameEn: string;

  @ApiProperty({ nullable: true })
  descriptionEs: string | null;

  @ApiProperty({ nullable: true })
  descriptionEn: string | null;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty({ nullable: true })
  altitudeM: number | null;

  @ApiProperty()
  isItineraryStop: boolean;

  @ApiProperty({ nullable: true })
  stageOrder: number | null;

  @ApiProperty({ nullable: true })
  dayNumber: number | null;

  @ApiProperty({ nullable: true })
  minutesFromPrevious: number | null;

  @ApiProperty()
  isOvernight: boolean;

  static fromEntity(point: PointOfInterest): PointOfInterestDto {
    return {
      id: point.id,
      type: point.type,
      nameEs: point.nameEs,
      nameEn: point.nameEn,
      descriptionEs: point.descriptionEs,
      descriptionEn: point.descriptionEn,
      latitude: point.latitude,
      longitude: point.longitude,
      altitudeM: point.altitudeM,
      isItineraryStop: point.isItineraryStop,
      stageOrder: point.stageOrder,
      dayNumber: point.dayNumber,
      minutesFromPrevious: point.minutesFromPrevious,
      isOvernight: point.isOvernight,
    };
  }
}
