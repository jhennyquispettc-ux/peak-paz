import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { TourHelpStatus } from '../bookings.enums.js';
import { Booking } from './booking.entity.js';

@Entity('tour_help_requests')
@Index('IDX_tour_help_status', ['status', 'createdAt'])
export class TourHelpRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Relation<Booking>;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TourHelpStatus,
    enumName: 'tour_help_status',
    default: TourHelpStatus.OPEN,
  })
  status: TourHelpStatus;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string | null;

  @Column({ name: 'attended_by', type: 'uuid', nullable: true })
  attendedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'attended_by' })
  attendedBy: Relation<User> | null;

  @Column({ name: 'attended_at', type: 'timestamptz', nullable: true })
  attendedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
