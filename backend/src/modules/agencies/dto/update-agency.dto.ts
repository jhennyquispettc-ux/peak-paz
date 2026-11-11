import { PartialType, PickType } from '@nestjs/swagger';
import { RegisterAgencyDto } from './register-agency.dto.js';

export const AGENCY_LEGAL_FIELDS = [
  'legalName',
  'taxId',
  'operatorLicense',
  'association',
] as const;

export class UpdateAgencyDto extends PartialType(
  PickType(RegisterAgencyDto, [
    ...AGENCY_LEGAL_FIELDS,
    'address',
    'descriptionEs',
    'descriptionEn',
  ] as const),
) {}
