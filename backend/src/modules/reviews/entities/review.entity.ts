import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('reviews')
@Check('CHK_reviews_rating', '"rating" BETWEEN 1 AND 5')
@Check(
  'CHK_reviews_hidden',
  '("hidden_at" IS NULL) = ("hidden_reason" IS NULL)',
)
@Index('IDX_reviews_created', ['createdAt'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @OneToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking: Relation<Booking>;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'hidden_at', type: 'timestamptz', nullable: true })
  hiddenAt: Date | null;

  @Column({ name: 'hidden_by', type: 'uuid', nullable: true })
  hiddenById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hidden_by' })
  hiddenBy: Relation<User> | null;

  @Column({ name: 'hidden_reason', type: 'text', nullable: true })
  hiddenReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
