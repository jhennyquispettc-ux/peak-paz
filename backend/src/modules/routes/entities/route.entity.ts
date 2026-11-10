import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { numericTransformer } from '../../../common/transformers/numeric.transformer.js';
import { AutonomyLevel, Difficulty } from '../routes.enums.js';
import { GearRecommendation } from './gear-recommendation.entity.js';
import { PointOfInterest } from './point-of-interest.entity.js';
import { RoutePhoto } from './route-photo.entity.js';
import { Species } from './species.entity.js';

@Entity('routes')
@Check('CHK_routes_days', '"days" >= 1')
@Check('CHK_routes_distance', '"distance_km" > 0')
@Check('CHK_routes_start_window', '"start_time_from" < "start_time_to"')
@Check('CHK_routes_private_max_people', '"private_max_people" >= 1')
@Check('CHK_routes_group_max_people', '"group_max_people" >= 1')
@Check('CHK_routes_prices', '"private_price" > 0 AND "group_min_price" > 0')
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  @Column({ name: 'name_es', type: 'varchar', length: 120 })
  nameEs: string;

  @Column({ name: 'name_en', type: 'varchar', length: 120 })
  nameEn: string;

  @Column({ name: 'description_es', type: 'text' })
  descriptionEs: string;

  @Column({ name: 'description_en', type: 'text' })
  descriptionEn: string;

  @Column({ type: 'enum', enum: Difficulty, enumName: 'difficulty' })
  difficulty: Difficulty;

  @Column({
    name: 'autonomy_level',
    type: 'enum',
    enum: AutonomyLevel,
    enumName: 'autonomy_level',
  })
  autonomyLevel: AutonomyLevel;

  @Column({ type: 'smallint' })
  days: number;

  @Column({
    name: 'distance_km',
    type: 'numeric',
    precision: 5,
    scale: 1,
    transformer: numericTransformer,
  })
  distanceKm: number;

  @Column({ name: 'elevation_gain_m', type: 'int' })
  elevationGainM: number;

  @Column({ name: 'elevation_loss_m', type: 'int' })
  elevationLossM: number;

  @Column({ name: 'max_altitude_m', type: 'int' })
  maxAltitudeM: number;

  @Column({ name: 'start_time_from', type: 'time' })
  startTimeFrom: string;

  @Column({ name: 'start_time_to', type: 'time' })
  startTimeTo: string;

  @Column({ name: 'how_to_get_there_es', type: 'text' })
  howToGetThereEs: string;

  @Column({ name: 'how_to_get_there_en', type: 'text' })
  howToGetThereEn: string;

  @Column({ name: 'best_season_es', type: 'text', nullable: true })
  bestSeasonEs: string | null;

  @Column({ name: 'best_season_en', type: 'text', nullable: true })
  bestSeasonEn: string | null;

  @Column({ name: 'emergency_contacts', type: 'text' })
  emergencyContacts: string;

  @Column({
    name: 'start_latitude',
    type: 'numeric',
    precision: 9,
    scale: 6,
    transformer: numericTransformer,
  })
  startLatitude: number;

  @Column({
    name: 'start_longitude',
    type: 'numeric',
    precision: 9,
    scale: 6,
    transformer: numericTransformer,
  })
  startLongitude: number;

  @Column({ type: 'jsonb', nullable: true })
  track: Record<string, unknown> | null;

  @Column({
    name: 'private_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  privatePrice: number;

  @Column({ name: 'private_max_people', type: 'smallint', default: 5 })
  privateMaxPeople: number;

  @Column({
    name: 'group_min_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  groupMinPrice: number;

  @Column({ name: 'group_max_people', type: 'smallint' })
  groupMaxPeople: number;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => PointOfInterest, (point) => point.route)
  pointsOfInterest: Relation<PointOfInterest[]>;

  @OneToMany(() => GearRecommendation, (gear) => gear.route)
  gearRecommendations: Relation<GearRecommendation[]>;

  @OneToMany(() => RoutePhoto, (photo) => photo.route)
  photos: Relation<RoutePhoto[]>;

  @ManyToMany(() => Species)
  @JoinTable({
    name: 'route_species',
    joinColumn: { name: 'route_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'species_id', referencedColumnName: 'id' },
  })
  species: Relation<Species[]>;
}
