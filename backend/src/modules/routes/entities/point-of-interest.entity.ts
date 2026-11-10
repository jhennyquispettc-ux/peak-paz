import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer.js';
import { PointOfInterestType } from '../routes.enums.js';
import { Route } from './route.entity.js';

@Entity('points_of_interest')
@Index('UQ_points_of_interest_route_stage_order', ['routeId', 'stageOrder'], {
  unique: true,
  where: '"stage_order" IS NOT NULL',
})
@Check(
  'CHK_points_of_interest_itinerary_stop',
  `("is_itinerary_stop" AND "stage_order" IS NOT NULL AND "day_number" IS NOT NULL AND "minutes_from_previous" IS NOT NULL)
   OR (NOT "is_itinerary_stop" AND "stage_order" IS NULL AND "day_number" IS NULL AND "minutes_from_previous" IS NULL)`,
)
@Check(
  'CHK_points_of_interest_minutes',
  '"minutes_from_previous" IS NULL OR "minutes_from_previous" >= 0',
)
export class PointOfInterest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string;

  @ManyToOne(() => Route, (route) => route.pointsOfInterest, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'route_id' })
  route: Relation<Route>;

  @Column({
    type: 'enum',
    enum: PointOfInterestType,
    enumName: 'point_of_interest_type',
  })
  type: PointOfInterestType;

  @Column({ name: 'name_es', type: 'varchar', length: 120 })
  nameEs: string;

  @Column({ name: 'name_en', type: 'varchar', length: 120 })
  nameEn: string;

  @Column({ name: 'description_es', type: 'text', nullable: true })
  descriptionEs: string | null;

  @Column({ name: 'description_en', type: 'text', nullable: true })
  descriptionEn: string | null;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    transformer: numericTransformer,
  })
  latitude: number;

  @Column({
    type: 'numeric',
    precision: 9,
    scale: 6,
    transformer: numericTransformer,
  })
  longitude: number;

  @Column({ name: 'altitude_m', type: 'int', nullable: true })
  altitudeM: number | null;

  @Column({ name: 'is_itinerary_stop', type: 'boolean', default: false })
  isItineraryStop: boolean;

  @Column({ name: 'stage_order', type: 'smallint', nullable: true })
  stageOrder: number | null;

  @Column({ name: 'day_number', type: 'smallint', nullable: true })
  dayNumber: number | null;

  @Column({ name: 'minutes_from_previous', type: 'int', nullable: true })
  minutesFromPrevious: number | null;

  @Column({ name: 'is_overnight', type: 'boolean', default: false })
  isOvernight: boolean;
}
