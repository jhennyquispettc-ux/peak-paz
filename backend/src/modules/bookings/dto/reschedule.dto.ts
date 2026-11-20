import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsString, Length } from 'class-validator';
import { RescheduleResponse } from '../bookings.enums.js';
import { Reschedule } from '../entities/reschedule.entity.js';

export class ProposeRescheduleDto {
  @ApiProperty({ example: '2026-12-12', description: 'Nueva fecha del tour' })
  @IsISO8601({ strict: true })
  @Length(10, 10)
  newDate: string;

  @ApiProperty({ example: 'Pronóstico de nevada fuerte en la cumbre' })
  @IsString()
  @Length(5, 200)
  reason: string;
}

export class RescheduleDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ example: '2026-12-10' })
  previousDate: string;

  @ApiProperty({ example: '2026-12-12' })
  newDate: string;

  @ApiProperty()
  reason: string;

  @ApiProperty({ enum: RescheduleResponse })
  response: RescheduleResponse;

  @ApiProperty({
    description:
      'Hasta cuándo puede responder el turista. Sin respuesta, la reserva sigue en la fecha original',
  })
  respondBy: Date;

  @ApiProperty({ nullable: true })
  respondedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(reschedule: Reschedule): RescheduleDto {
    return {
      id: reschedule.id,
      bookingId: reschedule.bookingId,
      previousDate: reschedule.previousDate,
      newDate: reschedule.newDate,
      reason: reschedule.reason,
      response: reschedule.response,
      respondBy: reschedule.respondBy,
      respondedAt: reschedule.respondedAt,
      createdAt: reschedule.createdAt,
    };
  }
}
