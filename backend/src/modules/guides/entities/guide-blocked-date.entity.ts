import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { GuideProfile } from './guide-profile.entity.js';

@Entity('guide_blocked_dates')
@Check('CHK_guide_blocked_dates_range', '"date_from" <= "date_to"')
export class GuideBlockedDate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guide_profile_id', type: 'uuid' })
  guideProfileId: string;

  @ManyToOne(() => GuideProfile, (profile) => profile.blockedDates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'guide_profile_id' })
  guideProfile: Relation<GuideProfile>;

  @Column({ name: 'date_from', type: 'date' })
  dateFrom: string;

  @Column({ name: 'date_to', type: 'date' })
  dateTo: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  reason: string | null;
}
