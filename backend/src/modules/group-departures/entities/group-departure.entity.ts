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
import { Agency } from '../../agencies/entities/agency.entity.js';
import { Route } from '../../routes/entities/route.entity.js';
import { GroupDepartureStatus } from '../group-departures.enums.js';

@Entity('group_departures')
@Index('IDX_group_departures_route_date', ['routeId', 'departureDate'])
@Check(
  'CHK_group_departures_people',
  '"min_people" >= 1 AND "min_people" <= "max_people"',
)
@Check('CHK_group_departures_price', '"price_per_person" > 0')
export class GroupDeparture {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agency_id', type: 'uuid' })
  agencyId: string;

  @ManyToOne(() => Agency, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'agency_id' })
  agency: Relation<Agency>;

  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string;

  @ManyToOne(() => Route, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'route_id' })
  route: Relation<Route>;

  @Column({ name: 'departure_date', type: 'date' })
  departureDate: string;

  @Column({ name: 'meeting_time', type: 'time' })
  meetingTime: string;

  @Column({ name: 'meeting_point', type: 'varchar', length: 200 })
  meetingPoint: string;

  @Column({
    name: 'price_per_person',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  pricePerPerson: number;

  @Column({ name: 'min_people', type: 'smallint', default: 3 })
  minPeople: number;

  @Column({ name: 'max_people', type: 'smallint' })
  maxPeople: number;

  @Column({ name: 'guide_name', type: 'varchar', length: 120 })
  guideName: string;

  @Column({
    type: 'enum',
    enum: GroupDepartureStatus,
    enumName: 'group_departure_status',
    default: GroupDepartureStatus.PUBLISHED,
  })
  status: GroupDepartureStatus;

  @Column({ name: 'closes_at', type: 'timestamptz' })
  closesAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
