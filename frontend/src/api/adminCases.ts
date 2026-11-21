import { api } from './client';
import type { Page, User } from './types';

export type ProviderKind = 'GUIDE' | 'AGENCY';
export type SanctionLevel = 'NONE' | 'HIDDEN' | 'SUSPENDED';
export type VerificationFilter = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReviewStatus = 'PENDING' | 'RESOLVED';
export type CancellationDecision = 'NO_SANCTION' | 'STRIKE' | 'STRIKE_AND_FINE';
export type DisputeStatus = 'OPEN' | 'RESOLVED';
export type DisputeDecision = 'TOUR_HAPPENED' | 'GUIDE_NO_SHOW';
export type ComplaintStatus = 'OPEN' | 'ACCEPTED' | 'REJECTED';
export type HelpStatus = 'OPEN' | 'ATTENDED';
export type StrikeStatus = 'ACTIVE' | 'REVERTED' | 'EXPIRED';
export type StrikeReason =
  'CANCELLED_WITHOUT_WEATHER' | 'NO_SHOW' | 'COMPLAINT';

export interface SanctionSubject {
  providerKind: ProviderKind;
  bookingId: string | null;
  bookingCode: string | null;
  groupDepartureId: string | null;
  tourDate: string | null;
  startTime: string | null;
  routeNameEs: string | null;
  guideProfileId: string | null;
  guideName: string | null;
  agencyId: string | null;
  agencyName: string | null;
}

export interface CancellationReview extends SanctionSubject {
  id: string;
  cancellationReason: string | null;
  cancelledAt: string;
  hoursBeforeStart: number | null;
  fineBaseAmount: number;
  hasEvidence: boolean;
  status: ReviewStatus;
  decision: CancellationDecision | null;
  fineAmount: number;
  fineSettled: number;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface CancellationReviewDetail extends CancellationReview {
  activeStrikes: number;
}

export interface Strike extends SanctionSubject {
  id: string;
  reason: StrikeReason;
  status: StrikeStatus;
  weight: number;
  expiresAt: string;
  createdAt: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  bookingCode: string;
  bookingStatus: string;
  tourDate: string | null;
  startTime: string | null;
  routeNameEs: string | null;
  guideProfileId: string | null;
  guideName: string | null;
  touristName: string | null;
  reason: 'GUIDE_NO_SHOW' | 'START_MISMATCH';
  openedBy: 'TOURIST' | 'SYSTEM';
  description: string | null;
  reconfirmedAt: string | null;
  guideStartedAt: string | null;
  guideStartDistanceM: number | null;
  touristStartedAt: string | null;
  status: DisputeStatus;
  decision: DisputeDecision | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface Complaint extends SanctionSubject {
  id: string;
  touristName: string | null;
  description: string;
  reason: 'GENERAL' | 'NO_SHOW';
  bookingStatus: string;
  status: ComplaintStatus;
  refundPercent: number | null;
  deductionAmount: number;
  deductionSettled: number;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface HelpRequest {
  id: string;
  bookingId: string;
  bookingCode: string;
  description: string;
  status: HelpStatus;
  adminNote: string | null;
  attendedAt: string | null;
  createdAt: string;
  tourDate: string | null;
  routeNameEs: string | null;
  touristName: string | null;
  touristPhone: string | null;
  touristEmail: string | null;
  providerName: string | null;
  providerPhone: string | null;
}

export interface AgencySummary {
  id: string;
  legalName: string;
  taxId: string;
  email: string;
  verificationStatus: VerificationFilter;
  documentsComplete: boolean;
  createdAt: string;
}

export interface AgencyDocument {
  id: string;
  type: string;
  expiresAt: string | null;
  uploadedAt: string;
}

export interface AgencyDetail {
  id: string;
  user: User;
  legalName: string;
  taxId: string;
  operatorLicense: string;
  association: string;
  address: string;
  verificationStatus: VerificationFilter;
  rejectionReason: string | null;
  documents: AgencyDocument[];
  missingDocuments: string[];
}

export interface SanctionOutcome {
  activeStrikes: number | null;
  sanction: SanctionLevel | null;
}

export const AGENCY_DOCUMENTS = [
  { type: 'TAX_ID', label: 'NIT' },
  { type: 'OPERATOR_LICENSE', label: 'Licencia de operador' },
  { type: 'ASSOCIATION_CERTIFICATE', label: 'Certificado de asociación' },
  { type: 'REPRESENTATIVE_ID', label: 'Cédula del representante' },
] as const;

function listPath(path: string, status: string, page: number, limit: number) {
  const query = new URLSearchParams({
    status,
    page: String(page),
    limit: String(limit),
  });
  return `${path}?${query}`;
}

function postJson<T>(path: string, body?: unknown) {
  return api<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const listGuidesCount = (status: VerificationFilter) =>
  api<Page<{ id: string }>>(listPath('/admin/guides', status, 1, 1));

export const listAgencies = (
  status: VerificationFilter,
  page: number,
  limit = 10,
) => api<Page<AgencySummary>>(listPath('/admin/agencies', status, page, limit));

export const getAgency = (id: string) =>
  api<AgencyDetail>(`/admin/agencies/${id}`);

export const decideAgency = (
  id: string,
  status: 'APPROVED' | 'REJECTED',
  rejectionReason?: string,
) =>
  api<AgencyDetail>(`/admin/agencies/${id}/verification`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      ...(status === 'REJECTED' ? { rejectionReason } : {}),
    }),
  });

export const listCancellations = (
  status: ReviewStatus,
  page: number,
  limit = 15,
) =>
  api<Page<CancellationReview>>(
    listPath('/admin/cancellation-reviews', status, page, limit),
  );

export const getCancellation = (id: string) =>
  api<CancellationReviewDetail>(`/admin/cancellation-reviews/${id}`);

export const resolveCancellation = (
  id: string,
  body: {
    decision: CancellationDecision;
    finePercent?: number;
    resolution: string;
  },
) =>
  postJson<SanctionOutcome>(`/admin/cancellation-reviews/${id}/resolve`, body);

export const listDisputes = (status: DisputeStatus, page: number, limit = 15) =>
  api<Page<Dispute>>(listPath('/admin/disputes', status, page, limit));

export const resolveDispute = (
  id: string,
  body: { decision: DisputeDecision; resolution: string },
) => postJson<SanctionOutcome>(`/admin/disputes/${id}/resolve`, body);

export const listComplaints = (
  status: ComplaintStatus,
  page: number,
  limit = 15,
) => api<Page<Complaint>>(listPath('/admin/complaints', status, page, limit));

export const resolveComplaint = (
  id: string,
  body: {
    decision: 'ACCEPTED' | 'REJECTED';
    refundPercent?: number;
    strike?: boolean;
    resolution: string;
  },
) => postJson<SanctionOutcome>(`/admin/complaints/${id}/resolve`, body);

export const listHelpRequests = (
  status: HelpStatus,
  page: number,
  limit = 15,
) =>
  api<Page<HelpRequest>>(listPath('/admin/help-requests', status, page, limit));

export const attendHelpRequest = (id: string, note: string) =>
  postJson<HelpRequest>(`/admin/help-requests/${id}/attend`, { note });

export const listStrikes = (status: StrikeStatus, page: number, limit = 15) =>
  api<Page<Strike>>(listPath('/admin/strikes', status, page, limit));

export const revertStrike = (id: string) =>
  postJson<Strike>(`/admin/strikes/${id}/revert`);

export function providerName(subject: {
  agencyName?: string | null;
  guideName?: string | null;
}) {
  return subject.agencyName ?? subject.guideName ?? 'Sin proveedor';
}

export function sanctionNote(outcome: SanctionOutcome) {
  if (outcome.sanction === 'SUSPENDED') {
    return ' El proveedor quedó suspendido.';
  }
  if (outcome.sanction === 'HIDDEN') {
    return ' El proveedor quedó oculto del catálogo.';
  }
  return '';
}
