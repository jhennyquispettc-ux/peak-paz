import { PartialType } from '@nestjs/swagger';
import { CreateGearRecommendationDto } from './create-gear-recommendation.dto.js';

export class UpdateGearRecommendationDto extends PartialType(
  CreateGearRecommendationDto,
) {}
