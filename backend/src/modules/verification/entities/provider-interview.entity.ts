import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { ReviewSubject } from './document-review.entity.js';

export const INTERVIEW_MODALITIES = ['IN_PERSON', 'VIRTUAL'] as const;
export const INTERVIEW_RESULTS = ['PASSED', 'FAILED'] as const;
export type InterviewModality = (typeof INTERVIEW_MODALITIES)[number];
export type InterviewResult = (typeof INTERVIEW_RESULTS)[number];
export type InterviewStatus = 'SCHEDULED' | 'CANCELLED' | InterviewResult;

@Entity('provider_interviews')
@Index('IDX_provider_interviews_subject', [
  'subjectType',
  'subjectId',
  'createdAt',
])
@Index('UQ_provider_interviews_open', ['subjectType', 'subjectId'], {
  unique: true,
  where: `"status" = 'SCHEDULED'`,
})
export class ProviderInterview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subject_type', type: 'varchar', length: 10 })
  subjectType: ReviewSubject;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ type: 'varchar', length: 10 })
  modality: InterviewModality;

  @Column({ type: 'varchar', length: 300 })
  location: string;

  @Column({ type: 'varchar', length: 10, default: 'SCHEDULED' })
  status: InterviewStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'premises_visited', type: 'boolean', nullable: true })
  premisesVisited: boolean | null;

  @Column({ name: 'scheduled_by', type: 'uuid', nullable: true })
  scheduledById: string | null;

  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedById: string | null;

  @Column({ name: 'recorded_at', type: 'timestamptz', nullable: true })
  recordedAt: Date | null;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'clock_timestamp()',
  })
  createdAt: Date;
}
