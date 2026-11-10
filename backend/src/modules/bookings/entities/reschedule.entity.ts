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
import { RescheduleResponse } from '../bookings.enums.js';
import { Booking } from './booking.entity.js';

@Entity('reschedules')
@Check('CHK_reschedules_dates', '"previous_date" <> "new_date"')
export class Reschedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Relation<Booking>;

  @Column({ name: 'previous_date', type: 'date' })
  previousDate: string;

  @Column({ name: 'new_date', type: 'date' })
  newDate: string;

  @Column({ type: 'varchar', length: 200 })
  reason: string;

  @Column({
    type: 'enum',
    enum: RescheduleResponse,
    enumName: 'reschedule_response',
    default: RescheduleResponse.PENDING,
  })
  response: RescheduleResponse;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
