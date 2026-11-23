import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('email_verifications')
export class EmailVerification {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'varchar', length: 160 })
  email: string;

  @Column({
    name: 'token_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
    unique: true,
  })
  tokenHash: string | null;

  @Column({ name: 'token_nonce', type: 'varchar', length: 64, nullable: true })
  tokenNonce: string | null;

  @Column({ name: 'token_expires_at', type: 'timestamptz', nullable: true })
  tokenExpiresAt: Date | null;

  @Column({ name: 'next_resend_at', type: 'timestamptz' })
  nextResendAt: Date;

  @Column({ name: 'email_sent_at', type: 'timestamptz', nullable: true })
  emailSentAt: Date | null;

  @Column({ name: 'email_failed_at', type: 'timestamptz', nullable: true })
  emailFailedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
