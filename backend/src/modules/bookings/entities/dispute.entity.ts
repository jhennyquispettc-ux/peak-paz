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
import { User } from '../../users/entities/user.entity.js';
import {
  DisputeDecision,
  DisputeParty,
  DisputeReason,
  DisputeStatus,
} from '../bookings.enums.js';
import { Booking } from './booking.entity.js';

@Entity('disputes')
@Unique('UQ_disputes_booking', ['bookingId'])
@Index('IDX_disputes_status', ['status', 'createdAt'])
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @OneToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking: Relation<Booking>;

  @Column({ type: 'enum', enum: DisputeReason, enumName: 'dispute_reason' })
  reason: DisputeReason;

  @Column({
    name: 'opened_by',
    type: 'enum',
    enum: DisputeParty,
    enumName: 'dispute_party',
  })
  openedBy: DisputeParty;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: DisputeStatus,
    enumName: 'dispute_status',
    default: DisputeStatus.OPEN,
  })
  status: DisputeStatus;

  @Column({
    type: 'enum',
    enum: DisputeDecision,
    enumName: 'dispute_decision',
    nullable: true,
  })
  decision: DisputeDecision | null;

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
