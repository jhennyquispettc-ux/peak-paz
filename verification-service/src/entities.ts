import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('verification_cases')
export class VerificationCase {
  @PrimaryColumn({ type: 'uuid' }) userId: string;
  @Column({ type: 'varchar', length: 160 }) email: string;
  @Column({ type: 'varchar', length: 80 }) firstName: string;
  @Column({ type: 'varchar', length: 10 }) role: 'TOURIST' | 'GUIDE';
  @Column({ type: 'timestamptz', nullable: true }) emailVerifiedAt: Date | null;
  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  tokenHash: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) tokenNonce:
    string | null;
  @Column({ type: 'timestamptz', nullable: true }) tokenExpiresAt: Date | null;
  @Column({ type: 'timestamptz' }) nextResendAt: Date;
  @Column({ type: 'timestamptz', nullable: true }) emailSentAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}

export interface ReviewDocument {
  id: string;
  type: string;
  expiresAt: string | null;
}
export interface ReviewSnapshot {
  firstName: string;
  lastName: string;
  nationalId: string;
  documents: ReviewDocument[];
}

@Entity('credential_reviews')
export class CredentialReview {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'varchar', length: 64 }) fingerprint: string;
  @Column({ type: 'jsonb' }) snapshot: ReviewSnapshot;
  @Column({ type: 'varchar', length: 10, default: 'PENDING' }) status:
    'PENDING' | 'APPROVED' | 'REJECTED';
  @Column({ type: 'varchar', length: 500, nullable: true }) reason:
    string | null;
  @Column({ type: 'uuid', nullable: true }) reviewerId: string | null;
  @Column({ type: 'timestamptz', nullable: true }) decidedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
