import { PartialType } from '@nestjs/swagger';
import { CreatePointOfInterestDto } from './create-point-of-interest.dto.js';

export class UpdatePointOfInterestDto extends PartialType(
  CreatePointOfInterestDto,
) {}
