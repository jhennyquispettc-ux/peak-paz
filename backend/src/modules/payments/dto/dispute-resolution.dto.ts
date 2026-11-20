import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length } from 'class-validator';
import { DisputeDecision } from '../../bookings/bookings.enums.js';
import { DisputeDto } from '../../bookings/dto/tour-check.dto.js';
import { SanctionLevel } from '../../strikes/sanctions.js';
import { StrikeDto } from '../../strikes/dto/strike.dto.js';
import { RefundDto } from './payment.dto.js';

export class ResolveDisputeDto {
  @ApiProperty({
    enum: DisputeDecision,
    description:
      'TOUR_HAPPENED completa el tour y paga al guía. GUIDE_NO_SHOW reembolsa al turista y da un strike grave al guía',
  })
  @IsEnum(DisputeDecision)
  decision: DisputeDecision;

  @ApiProperty({
    example: 'El guía marcó el inicio a 80 metros del punto de partida.',
  })
  @IsString()
  @Length(5, 1000)
  resolution: string;
}

export class DisputeResolutionDto {
  @ApiProperty({ type: DisputeDto })
  dispute: DisputeDto;

  @ApiProperty({ type: RefundDto, nullable: true })
  refund: RefundDto | null;

  @ApiProperty({ type: StrikeDto, nullable: true })
  strike: StrikeDto | null;

  @ApiProperty({ example: 2, nullable: true })
  activeStrikes: number | null;

  @ApiProperty({ enum: SanctionLevel, nullable: true })
  sanction: SanctionLevel | null;
}
