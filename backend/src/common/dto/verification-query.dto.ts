import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { VerificationStatus } from '../enums/verification-status.enum.js';
import { PaginationQueryDto } from './pagination-query.dto.js';

export class VerificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VerificationStatus })
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;

  @ApiPropertyOptional({ description: 'Busca por nombre o correo' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
