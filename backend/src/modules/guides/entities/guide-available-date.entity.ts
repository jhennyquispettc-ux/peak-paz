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
import { GuideProfile } from './guide-profile.entity.js';

@Entity('guide_available_dates')
@Index('IDX_guide_available_dates_guide_date', ['guideProfileId', 'date'])
@Check('CHK_guide_available_dates_time_range', '"time_from" < "time_to"')
export class GuideAvailableDate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guide_profile_id', type: 'uuid' })
  guideProfileId: string;

  @ManyToOne(() => GuideProfile, (profile) => profile.availableDates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'guide_profile_id' })
  guideProfile: Relation<GuideProfile>;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'time_from', type: 'time' })
  timeFrom: string;

  @Column({ name: 'time_to', type: 'time' })
  timeTo: string;
}
