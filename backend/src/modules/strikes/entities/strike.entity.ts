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
import { Booking } from '../../bookings/entities/booking.entity.js';
import { GroupDeparture } from '../../group-departures/entities/group-departure.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { StrikeReason, StrikeStatus } from '../strikes.enums.js';

@Entity('strikes')
@Index('IDX_strikes_booking', ['bookingId'])
@Index('IDX_strikes_departure', ['groupDepartureId'])
export class Strike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId: string | null;

  @ManyToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking: Relation<Booking> | null;

  @Column({ name: 'group_departure_id', type: 'uuid', nullable: true })
  groupDepartureId: string | null;

  @ManyToOne(() => GroupDeparture, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'group_departure_id' })
  groupDeparture: Relation<GroupDeparture> | null;

  @Column({ type: 'enum', enum: StrikeReason, enumName: 'strike_reason' })
  reason: StrikeReason;

  @Column({
    type: 'enum',
    enum: StrikeStatus,
    enumName: 'strike_status',
    default: StrikeStatus.ACTIVE,
  })
  status: StrikeStatus;

  @Column({ type: 'smallint', default: 1 })
  weight: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_by' })
  assignedBy: Relation<User> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
