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

@Entity('guide_availabilities')
@Check('CHK_guide_availabilities_weekday', '"weekday" BETWEEN 0 AND 6')
@Check('CHK_guide_availabilities_time_range', '"time_from" < "time_to"')
export class GuideAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guide_profile_id', type: 'uuid' })
  guideProfileId: string;

  @ManyToOne(() => GuideProfile, (profile) => profile.availabilities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'guide_profile_id' })
  guideProfile: Relation<GuideProfile>;

  @Column({ type: 'smallint' })
  weekday: number;

  @Column({ name: 'time_from', type: 'time' })
  timeFrom: string;

  @Column({ name: 'time_to', type: 'time' })
  timeTo: string;
}
