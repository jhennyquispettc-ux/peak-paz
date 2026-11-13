import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { GuideProfile } from './guide-profile.entity.js';

@Entity('guide_commitments')
@Index('IDX_guide_commitments_guide_starts', ['guideProfileId', 'startsAt'])
@Check('CHK_guide_commitments_range', '"starts_at" < "ends_at"')
export class GuideCommitment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'guide_profile_id', type: 'uuid' })
  guideProfileId: string;

  @ManyToOne(() => GuideProfile, (profile) => profile.commitments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'guide_profile_id' })
  guideProfile: Relation<GuideProfile>;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
