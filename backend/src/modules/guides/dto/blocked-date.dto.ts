import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, Length } from 'class-validator';
import { GuideBlockedDate } from '../entities/guide-blocked-date.entity.js';

export class CreateBlockedDateDto {
  @ApiProperty({ example: '2026-12-24' })
  @IsISO8601({ strict: true })
  dateFrom: string;

  @ApiProperty({ example: '2026-12-26' })
  @IsISO8601({ strict: true })
  dateTo: string;

  @ApiPropertyOptional({ example: 'Navidad en familia' })
  @IsOptional()
  @IsString()
  @Length(2, 200)
  reason?: string;
}

export class BlockedDateDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '2026-12-24' })
  dateFrom: string;

  @ApiProperty({ example: '2026-12-26' })
  dateTo: string;

  @ApiProperty({ nullable: true })
  reason: string | null;

  static fromEntity(blocked: GuideBlockedDate): BlockedDateDto {
    return {
      id: blocked.id,
      dateFrom: blocked.dateFrom,
      dateTo: blocked.dateTo,
      reason: blocked.reason,
    };
  }
}
