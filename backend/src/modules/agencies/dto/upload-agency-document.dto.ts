import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { AgencyDocumentType } from '../agencies.enums.js';

export class UploadAgencyDocumentDto {
  @ApiProperty({ enum: AgencyDocumentType })
  @IsEnum(AgencyDocumentType)
  type: AgencyDocumentType;

  @ApiPropertyOptional({ example: '2027-06-30' })
  @IsOptional()
  @IsISO8601({ strict: true })
  expiresAt?: string;
}
