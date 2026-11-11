import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, Length, ValidateIf } from 'class-validator';
import { VerificationStatus } from '../enums/verification-status.enum.js';

const DECISIONS = [VerificationStatus.APPROVED, VerificationStatus.REJECTED];

export class VerificationDecisionDto {
  @ApiProperty({ enum: DECISIONS })
  @IsIn(DECISIONS)
  status: VerificationStatus.APPROVED | VerificationStatus.REJECTED;

  @ApiPropertyOptional({
    example: 'La credencial de guía está vencida.',
    description: 'Obligatorio cuando se rechaza',
  })
  @ValidateIf(
    (dto: VerificationDecisionDto) =>
      dto.status === VerificationStatus.REJECTED,
  )
  @IsString()
  @Length(5, 500)
  rejectionReason?: string;
}
