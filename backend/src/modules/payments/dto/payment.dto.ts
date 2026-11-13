import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean } from 'class-validator';
import { Payment } from '../entities/payment.entity.js';
import { Refund } from '../entities/refund.entity.js';
import {
  PaymentStatus,
  RefundReason,
  RefundStatus,
} from '../payments.enums.js';

export class StartPaymentDto {
  @ApiProperty({
    example: true,
    description: 'El turista acepta los términos y la política de cancelación',
  })
  @IsBoolean()
  @Equals(true, { message: 'acceptTerms must be true to pay' })
  acceptTerms: boolean;
}

export class PaymentDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  bookingId: string;

  @ApiProperty({ example: 'PAYPAL' })
  provider: string;

  @ApiProperty({ enum: PaymentStatus })
  status: PaymentStatus;

  @ApiProperty({ example: 150, description: 'Precio en bolivianos' })
  amountBob: number;

  @ApiProperty({ example: 'USD' })
  chargeCurrency: string;

  @ApiProperty({ example: 6.96, nullable: true })
  exchangeRate: number | null;

  @ApiProperty({ example: 21.55, nullable: true })
  chargedAmount: number | null;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(payment: Payment): PaymentDto {
    return {
      id: payment.id,
      bookingId: payment.bookingId,
      provider: payment.provider,
      status: payment.status,
      amountBob: payment.amountBob,
      chargeCurrency: payment.chargeCurrency,
      exchangeRate: payment.exchangeRate,
      chargedAmount: payment.chargedAmount,
      createdAt: payment.createdAt,
    };
  }
}

export class StartedPaymentDto extends PaymentDto {
  @ApiProperty({
    example:
      'https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T',
    description: 'Página donde el turista aprueba el pago',
  })
  approveUrl: string;
}

export class RefundDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 21.55, description: 'En la moneda del cobro' })
  amount: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ enum: RefundReason })
  reason: RefundReason;

  @ApiProperty({ enum: RefundStatus })
  status: RefundStatus;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(refund: Refund, currency: string): RefundDto {
    return {
      id: refund.id,
      amount: refund.amount,
      currency,
      reason: refund.reason,
      status: refund.status,
      createdAt: refund.createdAt,
    };
  }
}
