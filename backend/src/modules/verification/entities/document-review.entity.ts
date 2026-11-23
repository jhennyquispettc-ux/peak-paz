import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ReviewSubject = 'GUIDE' | 'AGENCY';
export type DocumentReviewStatus = 'PENDING' | 'COMPLETED' | 'FAILED';
export type DocumentRecommendation =
  'NO_ALERTS' | 'HAS_ALERTS' | 'MANUAL_REVIEW';

export interface RequestedDocument {
  id: string;
  type: string;
  expectedName: string;
}

export interface DocumentFinding {
  documentId: string;
  type: string;
  readable: boolean;
  confidence: number;
  nameScore: number | null;
  alerts: string[];
}

@Entity('document_reviews')
@Index('IDX_document_reviews_subject', [
  'subjectType',
  'subjectId',
  'createdAt',
])
export class DocumentReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subject_type', type: 'varchar', length: 10 })
  subjectType: ReviewSubject;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @Column({ type: 'varchar', length: 10, default: 'PENDING' })
  status: DocumentReviewStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  recommendation: DocumentRecommendation | null;

  @Column({ type: 'jsonb' })
  requested: RequestedDocument[];

  @Column({ type: 'jsonb', nullable: true })
  findings: DocumentFinding[] | null;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'clock_timestamp()',
  })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
