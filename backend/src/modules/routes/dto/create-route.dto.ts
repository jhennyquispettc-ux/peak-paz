import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { AutonomyLevel, Difficulty } from '../routes.enums.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class CreateRouteDto {
  @ApiPropertyOptional({
    example: 'choro-3-dias',
    description: 'Si no se envía, se genera a partir de nameEs',
  })
  @IsOptional()
  @Matches(SLUG_PATTERN, {
    message: 'slug must use lowercase letters, digits and hyphens',
  })
  @Length(3, 120)
  slug?: string;

  @ApiProperty({ example: 'El Choro (3 días)' })
  @IsString()
  @Length(3, 120)
  nameEs: string;

  @ApiProperty({ example: 'El Choro (3 days)' })
  @IsString()
  @Length(3, 120)
  nameEn: string;

  @ApiProperty()
  @IsString()
  @Length(10, 5000)
  descriptionEs: string;

  @ApiProperty()
  @IsString()
  @Length(10, 5000)
  descriptionEn: string;

  @ApiProperty({ enum: Difficulty })
  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @ApiProperty({ enum: AutonomyLevel })
  @IsEnum(AutonomyLevel)
  autonomyLevel: AutonomyLevel;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Max(15)
  days: number;

  @ApiProperty({ example: 57.5 })
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsPositive()
  @Max(9999.9)
  distanceKm: number;

  @ApiProperty({ example: 350 })
  @IsInt()
  @Min(0)
  elevationGainM: number;

  @ApiProperty({ example: 3500 })
  @IsInt()
  @Min(0)
  elevationLossM: number;

  @ApiProperty({ example: 4850 })
  @IsInt()
  @Min(0)
  @Max(7000)
  maxAltitudeM: number;

  @ApiProperty({ example: '06:00' })
  @Matches(TIME_PATTERN, { message: 'startTimeFrom must use HH:mm' })
  startTimeFrom: string;

  @ApiProperty({ example: '08:00' })
  @Matches(TIME_PATTERN, { message: 'startTimeTo must use HH:mm' })
  startTimeTo: string;

  @ApiProperty()
  @IsString()
  @Length(10, 3000)
  howToGetThereEs: string;

  @ApiProperty()
  @IsString()
  @Length(10, 3000)
  howToGetThereEn: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 1000)
  bestSeasonEs?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(3, 1000)
  bestSeasonEn?: string;

  @ApiProperty({ example: 'Policía 110, Bomberos 119' })
  @IsString()
  @Length(3, 1000)
  emergencyContacts: string;

  @ApiProperty({ example: -16.3315 })
  @IsLatitude()
  startLatitude: number;

  @ApiProperty({ example: -68.0381 })
  @IsLongitude()
  startLongitude: number;

  @ApiProperty({ example: 120, description: 'Precio del tour particular' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  privatePrice: number;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  privateMaxPeople?: number;

  @ApiProperty({
    example: 80,
    description: 'Precio mínimo por persona en salidas grupales',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  groupMinPrice: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(3)
  @Max(50)
  groupMaxPeople: number;
}
