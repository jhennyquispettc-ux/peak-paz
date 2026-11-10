import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { GearCategory } from '../routes.enums.js';
import { Route } from './route.entity.js';

@Entity('gear_recommendations')
export class GearRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string;

  @ManyToOne(() => Route, (route) => route.gearRecommendations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'route_id' })
  route: Relation<Route>;

  @Column({ type: 'enum', enum: GearCategory, enumName: 'gear_category' })
  category: GearCategory;

  @Column({ name: 'description_es', type: 'varchar', length: 200 })
  descriptionEs: string;

  @Column({ name: 'description_en', type: 'varchar', length: 200 })
  descriptionEn: string;

  @Column({ name: 'estimated_weight_g', type: 'int', nullable: true })
  estimatedWeightG: number | null;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired: boolean;
}
