import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  type Relation,
} from 'typeorm';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { Route } from '../../routes/entities/route.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { GuideProfile } from './guide-profile.entity.js';

@Entity('guide_routes')
@Unique('UQ_guide_routes_guide_route', ['guideProfileId', 'routeId'])
export class GuideRoute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guide_profile_id', type: 'uuid' })
  guideProfileId: string;

  @ManyToOne(() => GuideProfile, (profile) => profile.routes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'guide_profile_id' })
  guideProfile: Relation<GuideProfile>;

  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string;

  @ManyToOne(() => Route, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route: Relation<Route>;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    enumName: 'guide_route_status',
    default: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: Relation<User> | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;
}
