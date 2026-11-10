import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { PaymentStatus } from '../payments.enums.js';

@Entity('payments')
@Check('CHK_payments_amount_bob', '"amount_bob" > 0')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking: Relation<Booking>;

  @Column({ type: 'varchar', length: 30, default: 'PAYPAL' })
  provider: string;

  @Column({
    name: 'external_order_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  externalOrderId: string | null;

  @Column({
    name: 'external_authorization_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  externalAuthorizationId: string | null;

  @Column({
    name: 'external_capture_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  externalCaptureId: string | null;

  @Column({
    name: 'amount_bob',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  amountBob: number;

  @Column({ name: 'charge_currency', type: 'char', length: 3, default: 'USD' })
  chargeCurrency: string;

  @Column({
    name: 'exchange_rate',
    type: 'numeric',
    precision: 10,
    scale: 4,
    nullable: true,
    transformer: numericTransformer,
  })
  exchangeRate: number | null;

  @Column({
    name: 'charged_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  chargedAmount: number | null;

  @Column({
    name: 'provider_fee',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  providerFee: number | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
