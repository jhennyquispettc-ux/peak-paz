import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsISO8601, IsOptional } from 'class-validator';
import { GUIDE_CREDENTIAL_TYPES, GuideDocumentType } from '../guides.enums.js';
import type { GuideCredentialType } from '../guides.enums.js';

export class UploadGuideDocumentDto {
  @ApiProperty({ enum: GuideDocumentType })
  @IsEnum(GuideDocumentType)
  type: GuideDocumentType;

  @ApiPropertyOptional({ example: '2027-06-30' })
  @IsOptional()
  @IsISO8601({ strict: true })
  expiresAt?: string;

  @ApiPropertyOptional({ enum: GUIDE_CREDENTIAL_TYPES })
  @IsOptional()
  @IsIn(GUIDE_CREDENTIAL_TYPES)
  credentialType?: GuideCredentialType;
}
