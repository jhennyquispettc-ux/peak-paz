import {
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
import { AgencyDocument } from './agency-document.entity.js';

@Entity('agencies')
export class Agency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ name: 'legal_name', type: 'varchar', length: 160 })
  legalName: string;

  @Column({ name: 'tax_id', type: 'varchar', length: 20, unique: true })
  taxId: string;

  @Column({ name: 'operator_license', type: 'varchar', length: 40 })
  operatorLicense: string;

  @Column({ type: 'varchar', length: 120 })
  association: string;

  @Column({ type: 'varchar', length: 200 })
  address: string;

  @Column({ name: 'description_es', type: 'text', nullable: true })
  descriptionEs: string | null;

  @Column({ name: 'description_en', type: 'text', nullable: true })
  descriptionEn: string | null;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: VerificationStatus,
    enumName: 'agency_verification_status',
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

  @OneToMany(() => AgencyDocument, (document) => document.agency)
  documents: Relation<AgencyDocument[]>;
}
