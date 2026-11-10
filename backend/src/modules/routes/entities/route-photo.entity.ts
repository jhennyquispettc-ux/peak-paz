import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Route } from './route.entity.js';

@Entity('route_photos')
export class RoutePhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string;

  @ManyToOne(() => Route, (route) => route.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route: Relation<Route>;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ name: 'public_id', type: 'varchar', length: 200 })
  publicId: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  credit: string | null;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder: number;
}
