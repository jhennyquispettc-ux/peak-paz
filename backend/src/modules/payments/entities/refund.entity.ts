import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer.js';
import { RefundReason, RefundStatus } from '../payments.enums.js';
import { Payment } from './payment.entity.js';

@Entity('refunds')
@Check('CHK_refunds_amount', '"amount" > 0')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => Payment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment: Relation<Payment>;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  amount: number;

  @Column({ type: 'enum', enum: RefundReason, enumName: 'refund_reason' })
  reason: RefundReason;

  @Column({
    name: 'external_refund_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  externalRefundId: string | null;

  @Column({
    type: 'enum',
    enum: RefundStatus,
    enumName: 'refund_status',
    default: RefundStatus.PENDING,
  })
  status: RefundStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
