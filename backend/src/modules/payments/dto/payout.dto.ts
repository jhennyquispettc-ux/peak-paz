import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Payout } from '../entities/payout.entity.js';
import { PayoutStatus } from '../payments.enums.js';

export class PayoutQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PayoutStatus })
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;
}

export class PayoutDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ example: 'PP-7K3M9QX2' })
  bookingCode: string;

  @ApiProperty({ example: '2026-12-05', nullable: true })
  tourDate: string | null;

  @ApiProperty({ nullable: true })
  routeNameEs: string | null;

  @ApiProperty({ example: 150, description: 'En bolivianos' })
  grossAmount: number;

  @ApiProperty({ example: 15 })
  commissionRate: number;

  @ApiProperty({ example: 22.5 })
  commissionAmount: number;

  @ApiProperty({ example: 0 })
  penaltyDeduction: number;

  @ApiProperty({ example: 127.5 })
  netAmount: number;

  @ApiProperty({ enum: PayoutStatus })
  status: PayoutStatus;

  @ApiProperty({ nullable: true })
  paidAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(payout: Payout): PayoutDto {
    return {
      id: payout.id,
      bookingId: payout.bookingId,
      bookingCode: payout.booking?.code,
      tourDate: payout.booking?.tourDate ?? null,
      routeNameEs: payout.booking?.route?.nameEs ?? null,
      grossAmount: payout.grossAmount,
      commissionRate: payout.commissionRate,
      commissionAmount: payout.commissionAmount,
      penaltyDeduction: payout.penaltyDeduction,
      netAmount: payout.netAmount,
      status: payout.status,
      paidAt: payout.paidAt,
      createdAt: payout.createdAt,
    };
  }
}

export class PayoutPageDto {
  @ApiProperty({ type: [PayoutDto] })
  data: PayoutDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
