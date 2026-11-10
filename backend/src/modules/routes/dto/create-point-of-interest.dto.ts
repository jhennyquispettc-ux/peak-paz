import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PointOfInterestType } from '../routes.enums.js';

export class CreatePointOfInterestDto {
  @ApiProperty({ enum: PointOfInterestType })
  @IsEnum(PointOfInterestType)
  type: PointOfInterestType;

  @ApiProperty({ example: 'Abra Chucura' })
  @IsString()
  @Length(2, 120)
  nameEs: string;

  @ApiProperty({ example: 'Chucura Pass' })
  @IsString()
  @Length(2, 120)
  nameEn: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 2000)
  descriptionEs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 2000)
  descriptionEn?: string;

  @ApiProperty({ example: -16.2891 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: -68.0472 })
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ example: 4850 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7000)
  altitudeM?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isItineraryStop?: boolean;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  stageOrder?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  dayNumber?: number;

  @ApiPropertyOptional({
    example: 90,
    description: 'Minutos de caminata desde la parada anterior del mismo día',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  minutesFromPrevious?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isOvernight?: boolean;
}
