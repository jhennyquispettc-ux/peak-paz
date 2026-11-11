import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { GuideDocumentType } from '../guides.enums.js';

export class UploadGuideDocumentDto {
  @ApiProperty({ enum: GuideDocumentType })
  @IsEnum(GuideDocumentType)
  type: GuideDocumentType;

  @ApiPropertyOptional({ example: '2027-06-30' })
  @IsOptional()
  @IsISO8601({ strict: true })
  expiresAt?: string;
}
