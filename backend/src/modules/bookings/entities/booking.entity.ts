import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer.js';
import { GroupDeparture } from '../../group-departures/entities/group-departure.entity.js';
import { GuideProfile } from '../../guides/entities/guide-profile.entity.js';
import { Route } from '../../routes/entities/route.entity.js';
import { User } from '../../users/entities/user.entity.js';
import {
  BookingSource,
  BookingStatus,
  BookingType,
} from '../bookings.enums.js';

@Entity('bookings')
@Index('IDX_bookings_guide_date', ['guideProfileId', 'tourDate'])
@Index('IDX_bookings_group_departure', ['groupDepartureId'])
@Index('IDX_bookings_tourist', ['touristId'])
@Check(
  'CHK_bookings_private',
  `"type" <> 'PRIVATE' OR (
     "guide_profile_id" IS NOT NULL AND "route_id" IS NOT NULL
     AND "tour_date" IS NOT NULL AND "start_time" IS NOT NULL
     AND "group_departure_id" IS NULL AND "source" = 'WEB'
   )`,
)
@Check(
  'CHK_bookings_group',
  `"type" <> 'GROUP' OR (
     "group_departure_id" IS NOT NULL AND "guide_profile_id" IS NULL
     AND "route_id" IS NULL AND "tour_date" IS NULL AND "start_time" IS NULL
   )`,
)
@Check(
  'CHK_bookings_source',
  `("source" = 'WEB' AND "tourist_id" IS NOT NULL)
   OR ("source" = 'MANUAL' AND "tourist_id" IS NULL AND "manual_contact" IS NOT NULL)`,
)
@Check('CHK_bookings_people_count', '"people_count" >= 1')
@Check('CHK_bookings_total_amount', '"total_amount" >= 0')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 12, unique: true })
  code: string;

  @Column({ type: 'enum', enum: BookingType, enumName: 'booking_type' })
  type: BookingType;

  @Column({
    type: 'enum',
    enum: BookingSource,
    enumName: 'booking_source',
    default: BookingSource.WEB,
  })
  source: BookingSource;

  @Column({ name: 'tourist_id', type: 'uuid', nullable: true })
  touristId: string | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tourist_id' })
  tourist: Relation<User> | null;

  @Column({ name: 'guide_profile_id', type: 'uuid', nullable: true })
  guideProfileId: string | null;

  @ManyToOne(() => GuideProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'guide_profile_id' })
  guideProfile: Relation<GuideProfile> | null;

  @Column({ name: 'group_departure_id', type: 'uuid', nullable: true })
  groupDepartureId: string | null;

  @ManyToOne(() => GroupDeparture, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'group_departure_id' })
  groupDeparture: Relation<GroupDeparture> | null;

  @Column({ name: 'route_id', type: 'uuid', nullable: true })
  routeId: string | null;

  @ManyToOne(() => Route, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'route_id' })
  route: Relation<Route> | null;

  @Column({ name: 'tour_date', type: 'date', nullable: true })
  tourDate: string | null;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime: string | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column({ name: 'people_count', type: 'smallint' })
  peopleCount: number;

  @Column({
    name: 'manual_contact',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  manualContact: string | null;

  @Column({
    name: 'total_amount',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    default: BookingStatus.REQUESTED,
  })
  status: BookingStatus;

  @Column({ name: 'respond_by', type: 'timestamptz', nullable: true })
  respondBy: Date | null;

  @Column({ name: 'pay_by', type: 'timestamptz', nullable: true })
  payBy: Date | null;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({
    name: 'terms_version',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  termsVersion: string | null;

  @Column({ name: 'terms_accepted_at', type: 'timestamptz', nullable: true })
  termsAcceptedAt: Date | null;

  @Column({
    name: 'terms_accepted_ip',
    type: 'varchar',
    length: 45,
    nullable: true,
  })
  termsAcceptedIp: string | null;

  @Column({ name: 'reconfirmed_at', type: 'timestamptz', nullable: true })
  reconfirmedAt: Date | null;

  @Column({ name: 'guide_started_at', type: 'timestamptz', nullable: true })
  guideStartedAt: Date | null;

  @Column({
    name: 'guide_start_latitude',
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: numericTransformer,
  })
  guideStartLatitude: number | null;

  @Column({
    name: 'guide_start_longitude',
    type: 'numeric',
    precision: 9,
    scale: 6,
    nullable: true,
    transformer: numericTransformer,
  })
  guideStartLongitude: number | null;

  @Column({ name: 'guide_start_distance_m', type: 'int', nullable: true })
  guideStartDistanceM: number | null;

  @Column({ name: 'tourist_started_at', type: 'timestamptz', nullable: true })
  touristStartedAt: Date | null;

  @Column({
    name: 'reconfirmation_alerted_at',
    type: 'timestamptz',
    nullable: true,
  })
  reconfirmationAlertedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
