import { PartialType, PickType } from '@nestjs/swagger';
import { RegisterGuideDto } from './register-guide.dto.js';

export class UpdateGuideProfileDto extends PartialType(
  PickType(RegisterGuideDto, [
    'nationalId',
    'languages',
    'yearsExperience',
    'bioEs',
    'bioEn',
  ] as const),
) {}
