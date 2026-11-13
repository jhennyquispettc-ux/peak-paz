import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches } from 'class-validator';
import { GuideAvailableDate } from '../entities/guide-available-date.entity.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateAvailableDateDto {
  @ApiProperty({ example: '2026-12-05' })
  @IsISO8601({ strict: true })
  date: string;

  @ApiProperty({
    example: '06:00',
    description: 'Desde qué hora puede empezar un tour ese día',
  })
  @Matches(TIME_PATTERN, { message: 'timeFrom must use HH:mm' })
  timeFrom: string;

  @ApiProperty({
    example: '09:00',
    description: 'Hasta qué hora puede empezar un tour ese día',
  })
  @Matches(TIME_PATTERN, { message: 'timeTo must use HH:mm' })
  timeTo: string;
}

export class AvailableDateDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '2026-12-05' })
  date: string;

  @ApiProperty({ example: '06:00' })
  timeFrom: string;

  @ApiProperty({ example: '09:00' })
  timeTo: string;

  static fromEntity(available: GuideAvailableDate): AvailableDateDto {
    return {
      id: available.id,
      date: available.date,
      timeFrom: available.timeFrom.slice(0, 5),
      timeTo: available.timeTo.slice(0, 5),
    };
  }
}
