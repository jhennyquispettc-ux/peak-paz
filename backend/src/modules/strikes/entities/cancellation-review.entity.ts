import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer.js';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { User } from '../../users/entities/user.entity.js';
import {
  CancellationDecision,
  CancellationReviewStatus,
} from '../strikes.enums.js';

@Entity('cancellation_reviews')
@Unique('UQ_cancellation_reviews_booking', ['bookingId'])
@Index('IDX_cancellation_reviews_status', ['status', 'createdAt'])
export class CancellationReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @OneToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking: Relation<Booking>;

  @Column({
    name: 'evidence_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  evidenceUrl: string | null;

  @Column({
    name: 'evidence_public_id',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  evidencePublicId: string | null;

  @Column({
    type: 'enum',
    enum: CancellationReviewStatus,
    enumName: 'cancellation_review_status',
    default: CancellationReviewStatus.PENDING,
  })
  status: CancellationReviewStatus;

  @Column({
    type: 'enum',
    enum: CancellationDecision,
    enumName: 'cancellation_decision',
    nullable: true,
  })
  decision: CancellationDecision | null;

  @Column({
    name: 'fine_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  fineAmount: number;

  @Column({
    name: 'fine_settled',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: numericTransformer,
  })
  fineSettled: number;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy: Relation<User> | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
