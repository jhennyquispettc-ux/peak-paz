import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { GuideCommitment } from '../entities/guide-commitment.entity.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateCommitmentDto {
  @ApiProperty({ example: 'Transfer aeropuerto con grupo de Francia' })
  @IsString()
  @Length(2, 120)
  title: string;

  @ApiProperty({ example: '2026-12-05' })
  @IsISO8601({ strict: true })
  dateFrom: string;

  @ApiPropertyOptional({
    example: '03:00',
    description: 'Sin hora, el compromiso empieza a las 00:00',
  })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'timeFrom must use HH:mm' })
  timeFrom?: string;

  @ApiProperty({ example: '2026-12-05' })
  @IsISO8601({ strict: true })
  dateTo: string;

  @ApiPropertyOptional({
    example: '05:00',
    description: 'Sin hora, el compromiso ocupa hasta el final de dateTo',
  })
  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'timeTo must use HH:mm' })
  timeTo?: string;

  @ApiPropertyOptional({ example: 'Recojo en el hotel Rosario' })
  @IsOptional()
  @IsString()
  @Length(2, 1000)
  notes?: string;
}

export class CommitmentDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiProperty({ nullable: true })
  notes: string | null;

  static fromEntity(commitment: GuideCommitment): CommitmentDto {
    return {
      id: commitment.id,
      title: commitment.title,
      startsAt: commitment.startsAt,
      endsAt: commitment.endsAt,
      notes: commitment.notes,
    };
  }
}
