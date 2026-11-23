import { api } from './client';
import type { ProviderPayout, ProviderReview, SanctionsSummary } from './guide';
import type { Page, User } from './types';

export type DepartureStatus =
  | 'PUBLISHED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_MIN_NOT_REACHED'
  | 'CANCELLED_BY_AGENCY'
  | 'CANCELLED_WEATHER';

export interface AgencyDocumentInfo {
  id: string;
  type: string;
  expiresAt: string | null;
  uploadedAt: string;
}

export interface AgencyMe {
  id: string;
  user: User;
  legalName: string;
  taxId: string;
  address: string;
  descriptionEs: string | null;
  descriptionEn: string | null;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  verifiedAt: string | null;
  ratingAverage: number;
  reviewsCount: number;
  documents: AgencyDocumentInfo[];
  missingDocuments: string[];
}

export interface Departure {
  id: string;
  route: { id: string; slug: string; nameEs: string; days: number };
  agency: { id: string; legalName: string; ratingAverage: number };
  departureDate: string;
  meetingTime: string;
  meetingPoint: string;
  guideName: string;
  pricePerPerson: number;
  minPeople: number;
  maxPeople: number;
  seatsTaken: number;
  seatsLeft: number;
  status: DepartureStatus;
  closesAt: string;
}

export interface Participant {
  bookingId: string;
  code: string;
  source: string;
  status: string;
  peopleCount: number;
  name: string;
  contact: string | null;
}

export interface DepartureDetail extends Departure {
  participants: Participant[];
}

export interface RouteOption {
  id: string;
  nameEs: string;
  days: number;
  groupMinPrice: number;
}

export interface NewDeparture {
  routeId: string;
  departureDate: string;
  meetingTime: string;
  meetingPoint: string;
  pricePerPerson: number;
  minPeople?: number;
  maxPeople: number;
  guideName: string;
}

export const getAgencyMe = () => api<AgencyMe>('/agencies/me');

export const updateAgencyMe = (body: Partial<AgencyMe>) =>
  api<AgencyMe>('/agencies/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export function uploadAgencyDocument(
  type: string,
  file: File,
  expiresAt: string,
) {
  const body = new FormData();
  body.set('type', type);
  body.set('file', file);
  if (expiresAt) body.set('expiresAt', expiresAt);
  return api('/agencies/me/documents', { method: 'POST', body });
}

export const requestAgencyReview = () =>
  api<AgencyMe>('/agencies/me/verification-request', { method: 'POST' });

export const listMyDepartures = () =>
  api<Departure[]>('/agencies/me/departures');

export const getMyDeparture = (id: string) =>
  api<DepartureDetail>(`/agencies/me/departures/${id}`);

export const createDeparture = (body: NewDeparture) =>
  api<Departure>('/agencies/me/departures', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const addManualBooking = (
  id: string,
  body: { peopleCount: number; contact: string },
) =>
  api<DepartureDetail>(`/agencies/me/departures/${id}/manual-bookings`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

export function cancelDeparture(
  id: string,
  input: { reason: string; weather: boolean; evidence: File | null },
) {
  const body = new FormData();
  body.set('reason', input.reason);
  body.set('weather', String(input.weather));
  if (input.evidence) body.set('evidence', input.evidence);
  return api<DepartureDetail>(`/agencies/me/departures/${id}/cancel`, {
    method: 'POST',
    body,
  });
}

export const listRouteOptions = () =>
  api<Page<RouteOption>>('/routes?limit=100');

export const listAgencyPayouts = (status: 'PENDING' | 'PAID', page: number) =>
  api<Page<ProviderPayout>>(
    `/agencies/me/payouts?status=${status}&page=${page}&limit=15`,
  );

export const getAgencySanctions = () =>
  api<SanctionsSummary>('/agencies/me/sanctions');

export const listAgencyReviews = (agencyId: string, page: number) =>
  api<Page<ProviderReview>>(
    `/agencies/${agencyId}/reviews?page=${page}&limit=10`,
  );
