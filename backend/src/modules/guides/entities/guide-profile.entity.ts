import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
} from 'typeorm';
import { VerificationStatus } from '../../../common/enums/verification-status.enum.js';
import { numericTransformer } from '../../../common/transformers/numeric.transformer.js';
import { User } from '../../users/entities/user.entity.js';
import { AvailabilityMode } from '../guides.enums.js';
import { GuideAvailability } from './guide-availability.entity.js';
import { GuideAvailableDate } from './guide-available-date.entity.js';
import { GuideCommitment } from './guide-commitment.entity.js';
import { GuideDocument } from './guide-document.entity.js';
import { GuideRoute } from './guide-route.entity.js';

@Entity('guide_profiles')
@Check('CHK_guide_profiles_years_experience', '"years_experience" >= 0')
export class GuideProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ name: 'national_id', type: 'varchar', length: 20 })
  nationalId: string;

  @Column({ name: 'bio_es', type: 'text', nullable: true })
  bioEs: string | null;

  @Column({ name: 'bio_en', type: 'text', nullable: true })
  bioEn: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  languages: string[];

  @Column({ name: 'years_experience', type: 'smallint', default: 0 })
  yearsExperience: number;

  @Column({
    name: 'availability_mode',
    type: 'enum',
    enum: AvailabilityMode,
    enumName: 'guide_availability_mode',
    default: AvailabilityMode.WEEKLY,
  })
  availabilityMode: AvailabilityMode;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: VerificationStatus,
    enumName: 'guide_verification_status',
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifiedBy: Relation<User> | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({
    name: 'rating_average',
    type: 'numeric',
    precision: 2,
    scale: 1,
    default: 0,
    transformer: numericTransformer,
  })
  ratingAverage: number;

  @Column({ name: 'reviews_count', type: 'int', default: 0 })
  reviewsCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => GuideDocument, (document) => document.guideProfile)
  documents: Relation<GuideDocument[]>;

  @OneToMany(() => GuideRoute, (guideRoute) => guideRoute.guideProfile)
  routes: Relation<GuideRoute[]>;

  @OneToMany(
    () => GuideAvailability,
    (availability) => availability.guideProfile,
  )
  availabilities: Relation<GuideAvailability[]>;

  @OneToMany(() => GuideAvailableDate, (date) => date.guideProfile)
  availableDates: Relation<GuideAvailableDate[]>;

  @OneToMany(() => GuideCommitment, (commitment) => commitment.guideProfile)
  commitments: Relation<GuideCommitment[]>;
}
