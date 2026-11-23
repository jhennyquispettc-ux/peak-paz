import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { GUIDE_CREDENTIAL_TYPES } from '../../guides/guides.enums.js';
import type { GuideCredentialType } from '../../guides/guides.enums.js';
import {
  INTERVIEW_MODALITIES,
  INTERVIEW_RESULTS,
} from '../entities/provider-interview.entity.js';
import type {
  InterviewModality,
  InterviewResult,
} from '../entities/provider-interview.entity.js';

export class ScheduleInterviewDto {
  @ApiProperty({ example: '2026-12-10T15:00:00-04:00' })
  @IsISO8601({ strict: true })
  scheduledAt: string;

  @ApiProperty({ enum: INTERVIEW_MODALITIES })
  @IsIn(INTERVIEW_MODALITIES)
  modality: InterviewModality;

  @ApiProperty({
    example: 'Calle Sagárnaga 213, La Paz',
    description: 'Lugar de la entrevista o enlace de la reunión virtual',
  })
  @IsString()
  @Length(5, 300)
  location: string;
}

export class RecordInterviewDto {
  @ApiProperty({ enum: INTERVIEW_RESULTS })
  @IsIn(INTERVIEW_RESULTS)
  result: InterviewResult;

  @ApiProperty({ example: 'Presentó sus documentos originales.' })
  @IsString()
  @Length(5, 1000)
  notes: string;

  @ApiPropertyOptional({ description: 'Agencia: se visitó el local' })
  @IsOptional()
  @IsBoolean()
  premisesVisited?: boolean;

  @ApiPropertyOptional({ enum: GUIDE_CREDENTIAL_TYPES })
  @IsOptional()
  @IsIn(GUIDE_CREDENTIAL_TYPES)
  credentialType?: GuideCredentialType;
}
