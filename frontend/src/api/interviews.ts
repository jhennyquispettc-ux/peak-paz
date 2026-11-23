import type { ReviewSubject } from './adminCases';
import { api } from './client';

export type CredentialType = 'SIRETUR' | 'FEBOGUIT';
export type InterviewModality = 'IN_PERSON' | 'VIRTUAL';

export interface Interview {
  id: string;
  scheduledAt: string;
  modality: InterviewModality;
  location: string;
  status: 'SCHEDULED' | 'PASSED' | 'FAILED' | 'CANCELLED';
  notes: string | null;
  premisesVisited: boolean | null;
  recordedAt: string | null;
}

export interface ApprovalState {
  canApprove: boolean;
  reason: string | null;
  message: string | null;
}

export interface InterviewOverview {
  interviews: Interview[];
  approval: ApprovalState;
  credentialType: CredentialType | null;
}

export const MODALITY_LABELS: Record<InterviewModality, string> = {
  IN_PERSON: 'Presencial',
  VIRTUAL: 'Virtual',
};

export const INTERVIEW_STATUS_LABELS: Record<Interview['status'], string> = {
  SCHEDULED: 'Agendada',
  PASSED: 'Satisfactoria',
  FAILED: 'No satisfactoria',
  CANCELLED: 'Cancelada',
};

export const getInterviews = (subject: ReviewSubject, id: string) =>
  api<InterviewOverview>(`/admin/interviews/${subject}/${id}`);

export const scheduleInterview = (
  subject: ReviewSubject,
  id: string,
  body: {
    scheduledAt: string;
    modality: InterviewModality;
    location: string;
  },
) =>
  api<Interview>(`/admin/interviews/${subject}/${id}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const recordInterview = (
  id: string,
  body: {
    result: 'PASSED' | 'FAILED';
    notes: string;
    premisesVisited?: boolean;
    credentialType?: CredentialType;
  },
) =>
  api<Interview>(`/admin/interviews/${id}/result`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const cancelInterview = (id: string) =>
  api<Interview>(`/admin/interviews/${id}/cancel`, { method: 'POST' });

export const getMyInterviews = () =>
  api<{ interviews: Interview[] }>('/interviews/me');
