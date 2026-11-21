import type { BookingStatus } from '../lib/bookingStatus';
import type { AdminPayout } from './adminManage';
import { api } from './client';
import type { Page, User } from './types';

export type RouteReview = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AvailabilityMode = 'WEEKLY' | 'BY_DATE';
export type ProviderPayout = AdminPayout;

export interface GuideRoute {
  id: string;
  routeId: string;
  routeSlug: string;
  routeNameEs: string;
  status: RouteReview;
  reviewedAt: string | null;
}

export interface GuideDocumentInfo {
  id: string;
  type: string;
  expiresAt: string | null;
  uploadedAt: string;
}

export interface GuideMe {
  id: string;
  user: User;
  nationalId: string;
  bioEs: string | null;
  bioEn: string | null;
  languages: string[];
  yearsExperience: number;
  verificationStatus: RouteReview;
  rejectionReason: string | null;
  verifiedAt: string | null;
  firstApprovedAt: string | null;
  ratingAverage: number;
  reviewsCount: number;
  documents: GuideDocumentInfo[];
  missingDocuments: string[];
  routes: GuideRoute[];
}

export interface GuideBooking {
  id: string;
  code: string;
  type: 'PRIVATE' | 'GROUP';
  status: BookingStatus;
  route: { id: string; slug: string; nameEs: string; days: number };
  tourist: {
    firstName: string;
    lastName: string;
    country: string | null;
    language: 'es' | 'en';
    email: string | null;
    phone: string | null;
  };
  tourDate: string;
  endDate: string;
  startTime: string;
  peopleCount: number;
  totalAmount: number;
  respondBy: string | null;
  payBy: string | null;
  acceptedAt: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  reconfirmedAt: string | null;
  guideStartedAt: string | null;
  touristStartedAt: string | null;
  createdAt: string;
}

export interface Reschedule {
  id: string;
  bookingId: string;
  previousDate: string;
  newDate: string;
  reason: string;
  response: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  respondBy: string;
  respondedAt: string | null;
  createdAt: string;
}

export interface WeeklySlot {
  weekday: number;
  timeFrom: string;
  timeTo: string;
}

export interface AvailableDate {
  id: string;
  date: string;
  timeFrom: string;
  timeTo: string;
}

export interface Commitment {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  notes: string | null;
}

export interface GuideSchedule {
  mode: AvailabilityMode;
  slots: WeeklySlot[];
  availableDates: AvailableDate[];
  commitments: Commitment[];
}

export interface AgendaBooking {
  id: string;
  code: string;
  status: BookingStatus;
  routeNameEs: string;
  peopleCount: number;
  startsAt: string;
  endsAt: string;
}

export interface GuideAgenda {
  mode: AvailabilityMode;
  from: string;
  to: string;
  bufferMinutes: number;
  availableWindows: { date: string; timeFrom: string; timeTo: string }[];
  commitments: Commitment[];
  bookings: AgendaBooking[];
}

export interface ProviderStrike {
  id: string;
  reason: 'CANCELLED_WITHOUT_WEATHER' | 'NO_SHOW' | 'COMPLAINT';
  status: 'ACTIVE' | 'REVERTED' | 'EXPIRED';
  weight: number;
  bookingCode: string | null;
  routeNameEs: string | null;
  tourDate: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface SanctionsSummary {
  activeStrikes: number;
  strikesToHide: number;
  strikesToSuspend: number;
  hiddenUntil: string | null;
  pendingFines: number;
  strikes: ProviderStrike[];
}

export interface ProviderReview {
  id: string;
  rating: number;
  comment: string | null;
  touristFirstName: string | null;
  touristCountry: string | null;
  routeNameEs: string | null;
  tourDate: string | null;
  createdAt: string;
}

function post<T>(path: string, body?: unknown) {
  return api<T>(path, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

function put<T>(path: string, body: unknown) {
  return api<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export const getGuideMe = () => api<GuideMe>('/guides/me');

export const updateGuideMe = (body: {
  bioEs?: string;
  bioEn?: string;
  languages: string[];
  yearsExperience: number;
}) =>
  api<GuideMe>('/guides/me', { method: 'PATCH', body: JSON.stringify(body) });

export function listGuideBookings(
  page: number,
  status?: BookingStatus,
  limit = 15,
) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) query.set('status', status);
  return api<Page<GuideBooking>>(`/guides/me/bookings?${query}`);
}

export const getBooking = (id: string) => api<GuideBooking>(`/bookings/${id}`);

export const acceptBooking = (id: string) =>
  post<GuideBooking>(`/guides/me/bookings/${id}/accept`);

export const rejectBooking = (id: string, reason?: string) =>
  post<GuideBooking>(`/guides/me/bookings/${id}/reject`, { reason });

export const reconfirmBooking = (id: string) =>
  post<GuideBooking>(`/guides/me/bookings/${id}/reconfirm`);

export const confirmTour = (
  id: string,
  location?: { latitude: number; longitude: number },
) => post<GuideBooking>(`/guides/me/bookings/${id}/start`, location ?? {});

export const listReschedules = (id: string) =>
  api<Reschedule[]>(`/guides/me/bookings/${id}/reschedules`);

export const proposeReschedule = (
  id: string,
  body: { newDate: string; reason: string },
) => post<Reschedule>(`/guides/me/bookings/${id}/reschedules`, body);

export function cancelGuideBooking(
  id: string,
  input: { reason: string; weather: boolean; evidence: File | null },
) {
  const body = new FormData();
  body.set('reason', input.reason);
  body.set('weather', String(input.weather));
  if (input.evidence) body.set('evidence', input.evidence);
  return api(`/guides/me/bookings/${id}/cancel`, { method: 'POST', body });
}

export const getSchedule = () => api<GuideSchedule>('/guides/me/schedule');

export const setScheduleMode = (mode: AvailabilityMode) =>
  put<GuideSchedule>('/guides/me/schedule/mode', { mode });

export const setScheduleSlots = (slots: WeeklySlot[]) =>
  put<GuideSchedule>('/guides/me/schedule/slots', { slots });

export const addAvailableDate = (body: Omit<AvailableDate, 'id'>) =>
  post<AvailableDate>('/guides/me/schedule/available-dates', body);

export const removeAvailableDate = (id: string) =>
  api<void>(`/guides/me/schedule/available-dates/${id}`, { method: 'DELETE' });

export const addCommitment = (body: {
  title: string;
  dateFrom: string;
  timeFrom?: string;
  dateTo: string;
  timeTo?: string;
  notes?: string;
}) => post<Commitment>('/guides/me/schedule/commitments', body);

export const removeCommitment = (id: string) =>
  api<void>(`/guides/me/schedule/commitments/${id}`, { method: 'DELETE' });

export const getAgenda = (from: string, to: string) =>
  api<GuideAgenda>(`/guides/me/agenda?from=${from}&to=${to}`);

export const requestGuideRoute = (routeId: string) =>
  post<GuideRoute>('/guides/me/routes', { routeId });

export const withdrawGuideRoute = (routeId: string) =>
  api<void>(`/guides/me/routes/${routeId}`, { method: 'DELETE' });

export function listPublicRoutes() {
  return api<Page<{ id: string; nameEs: string }>>('/routes?limit=100');
}

export function listGuidePayouts(status: 'PENDING' | 'PAID', page: number) {
  return api<Page<ProviderPayout>>(
    `/guides/me/payouts?status=${status}&page=${page}&limit=15`,
  );
}

export const getGuideSanctions = () =>
  api<SanctionsSummary>('/guides/me/sanctions');

export const listGuideReviews = (guideId: string, page: number) =>
  api<Page<ProviderReview>>(`/guides/${guideId}/reviews?page=${page}&limit=10`);

export function bookingStart(booking: { tourDate: string; startTime: string }) {
  return new Date(
    `${booking.tourDate}T${booking.startTime.slice(0, 5)}:00-04:00`,
  );
}
