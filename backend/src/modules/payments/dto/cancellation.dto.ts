import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { BookingDto } from '../../bookings/dto/booking.dto.js';
import { RefundDto } from './payment.dto.js';

export class TouristCancellationDto {
  @ApiPropertyOptional({ example: 'Cambio de planes' })
  @IsOptional()
  @IsString()
  @Length(3, 500)
  reason?: string;
}

export class GuideCancellationDto {
  @ApiProperty({ example: 'Pronóstico de nevada en la cumbre' })
  @IsString()
  @Length(5, 500)
  reason: string;

  @ApiPropertyOptional({
    default: false,
    description: 'La cancelación se debe al clima',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  weather?: boolean;
}

export class CancellationResultDto {
  @ApiProperty({ type: BookingDto })
  booking: BookingDto;

  @ApiProperty({
    type: RefundDto,
    nullable: true,
    description: 'Reembolso hecho, o null si no corresponde',
  })
  refund: RefundDto | null;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    description:
      'Revisión que abre la cancelación del guía para que el administrador decida la sanción',
  })
  reviewId: string | null;
}
