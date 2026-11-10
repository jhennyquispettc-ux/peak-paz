import { ApiProperty } from '@nestjs/swagger';
import { GearRecommendation } from '../entities/gear-recommendation.entity.js';
import { GearCategory } from '../routes.enums.js';

export class GearRecommendationDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: GearCategory })
  category: GearCategory;

  @ApiProperty()
  descriptionEs: string;

  @ApiProperty()
  descriptionEn: string;

  @ApiProperty({ nullable: true })
  estimatedWeightG: number | null;

  @ApiProperty()
  isRequired: boolean;

  static fromEntity(gear: GearRecommendation): GearRecommendationDto {
    return {
      id: gear.id,
      category: gear.category,
      descriptionEs: gear.descriptionEs,
      descriptionEn: gear.descriptionEn,
      estimatedWeightG: gear.estimatedWeightG,
      isRequired: gear.isRequired,
    };
  }
}
