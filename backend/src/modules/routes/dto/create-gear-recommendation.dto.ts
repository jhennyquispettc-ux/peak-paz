import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { GearCategory } from '../routes.enums.js';

export class CreateGearRecommendationDto {
  @ApiProperty({ enum: GearCategory })
  @IsEnum(GearCategory)
  category: GearCategory;

  @ApiProperty({ example: 'Bolsa de dormir para -10 °C' })
  @IsString()
  @Length(2, 200)
  descriptionEs: string;

  @ApiProperty({ example: 'Sleeping bag rated to -10 °C' })
  @IsString()
  @Length(2, 200)
  descriptionEn: string;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50000)
  estimatedWeightG?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}
