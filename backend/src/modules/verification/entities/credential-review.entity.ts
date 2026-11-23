import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export type CredentialReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ReviewSnapshot {
  firstName: string;
  lastName: string;
  nationalId: string;
  documents: { id: string; type: string; expiresAt: string | null }[];
}

@Entity('credential_reviews')
@Index('IDX_credential_reviews_user', ['userId', 'createdAt'])
export class CredentialReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'varchar', length: 64 })
  fingerprint: string;

  @Column({ type: 'jsonb' })
  snapshot: ReviewSnapshot;

  @Column({ type: 'varchar', length: 10, default: 'PENDING' })
  status: CredentialReviewStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @Column({ name: 'reviewer_id', type: 'uuid', nullable: true })
  reviewerId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: Relation<User> | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'clock_timestamp()',
  })
  createdAt: Date;
}
