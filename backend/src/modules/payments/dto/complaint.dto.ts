import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import {
  SanctionSubjectDto,
  StrikeDto,
  subjectOf,
} from '../../strikes/dto/strike.dto.js';
import { Complaint } from '../../strikes/entities/complaint.entity.js';
import { SanctionLevel } from '../../strikes/sanctions.js';
import { ComplaintStatus } from '../../strikes/strikes.enums.js';
import { RefundDto } from './payment.dto.js';

export class CreateComplaintDto {
  @ApiProperty({
    example:
      'El guía nos dejó solos en el descenso y llegamos de noche sin linterna.',
  })
  @IsString()
  @Length(20, 2000)
  description: string;
}

export class ComplaintQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ComplaintStatus })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;
}

export class ResolveComplaintDto {
  @ApiProperty({ enum: [ComplaintStatus.ACCEPTED, ComplaintStatus.REJECTED] })
  @IsIn([ComplaintStatus.ACCEPTED, ComplaintStatus.REJECTED])
  decision: ComplaintStatus.ACCEPTED | ComplaintStatus.REJECTED;

  @ApiPropertyOptional({
    example: 50,
    minimum: 0,
    maximum: 100,
    description:
      'Obligatorio al aceptar. Porcentaje de lo pagado que se devuelve al turista y se descuenta al proveedor',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  refundPercent?: number;

  @ApiPropertyOptional({
    default: false,
    description: 'Solo al aceptar. Da un strike al guía o a la agencia',
  })
  @IsOptional()
  @IsBoolean()
  strike?: boolean;

  @ApiProperty({ example: 'El guía no acompañó al grupo en el descenso.' })
  @IsString()
  @Length(5, 1000)
  resolution: string;
}

export class ComplaintDto extends SanctionSubjectDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Tom Becker', nullable: true })
  touristName: string | null;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ComplaintStatus })
  status: ComplaintStatus;

  @ApiProperty({ example: 50, nullable: true })
  refundPercent: number | null;

  @ApiProperty({
    example: 75,
    description: 'Bolivianos que se descuentan al proveedor por el reembolso',
  })
  deductionAmount: number;

  @ApiProperty({ example: 75, description: 'Parte ya descontada' })
  deductionSettled: number;

  @ApiProperty({ nullable: true })
  resolution: string | null;

  @ApiProperty({ nullable: true })
  resolvedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(complaint: Complaint): ComplaintDto {
    const booking = complaint.booking;
    const tourist = booking.tourist;
    return Object.assign(subjectOf(booking, booking.groupDeparture), {
      id: complaint.id,
      touristName: tourist ? `${tourist.firstName} ${tourist.lastName}` : null,
      description: complaint.description,
      status: complaint.status,
      refundPercent: complaint.refundPercent,
      deductionAmount: complaint.deductionAmount,
      deductionSettled: complaint.deductionSettled,
      resolution: complaint.resolution,
      resolvedAt: complaint.resolvedAt,
      createdAt: complaint.createdAt,
    });
  }
}

export class ComplaintPageDto {
  @ApiProperty({ type: [ComplaintDto] })
  data: ComplaintDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class ComplaintResolutionDto {
  @ApiProperty({ type: ComplaintDto })
  complaint: ComplaintDto;

  @ApiProperty({ type: RefundDto, nullable: true })
  refund: RefundDto | null;

  @ApiProperty({ type: StrikeDto, nullable: true })
  strike: StrikeDto | null;

  @ApiProperty({ example: 1, nullable: true })
  activeStrikes: number | null;

  @ApiProperty({ enum: SanctionLevel, nullable: true })
  sanction: SanctionLevel | null;
}
