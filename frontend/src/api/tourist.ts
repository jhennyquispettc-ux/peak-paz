import type { BookingStatus } from '../lib/bookingStatus';
import { ApiError, api } from './client';
import type { Reschedule } from './guide';
import type { Page, PublicGuide } from './types';

export interface TouristBooking {
  id: string;
  code: string;
  type: 'PRIVATE' | 'GROUP';
  status: BookingStatus;
  route: {
    id: string;
    slug: string;
    nameEs: string;
    nameEn: string;
    days: number;
  };
  guide: { id: string; firstName: string; lastName: string } | null;
  agency: { id: string; legalName: string } | null;
  groupDepartureId: string | null;
  tourDate: string;
  endDate: string;
  startTime: string;
  peopleCount: number;
  totalAmount: number;
  respondBy: string | null;
  payBy: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  reconfirmedAt: string | null;
  guideStartedAt: string | null;
  touristStartedAt: string | null;
  createdAt: string;
}

export interface PublicDeparture {
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
  status: string;
  closesAt: string;
}

export interface StartedPayment {
  id: string;
  bookingId: string;
  provider: string;
  status: string;
  amountBob: number;
  chargeCurrency: string;
  exchangeRate: number | null;
  chargedAmount: number | null;
  approveUrl: string;
}

export interface CancellationPreview {
  cancellable: boolean;
  paid: boolean;
  refundPercent: number;
  refundAmount: number;
  retainedAmount: number;
  guideMissedReconfirmation: boolean;
}

export interface MyReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface MyComplaint {
  id: string;
  description: string;
  reason: 'GENERAL' | 'NO_SHOW';
  status: 'OPEN' | 'ACCEPTED' | 'REJECTED';
  refundPercent: number | null;
  resolution: string | null;
  createdAt: string;
}

export interface MyHelpRequest {
  id: string;
  description: string;
  status: 'OPEN' | 'ATTENDED';
  adminNote: string | null;
  attendedAt: string | null;
  createdAt: string;
}

function post<T>(path: string, body?: unknown) {
  return api<T>(path, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) return null;
    throw caught;
  }
}

export function listMyBookings(page: number, status?: BookingStatus) {
  const query = new URLSearchParams({ page: String(page), limit: '10' });
  if (status) query.set('status', status);
  return api<Page<TouristBooking>>(`/bookings/me?${query}`);
}

export const getMyBooking = (id: string) =>
  api<TouristBooking>(`/bookings/${id}`);

export const createBooking = (body: {
  routeId: string;
  guideProfileId: string;
  tourDate: string;
  startTime: string;
  peopleCount: number;
}) => post<TouristBooking>('/bookings', body);

export function availableGuides(slug: string, date: string, startTime: string) {
  const query = new URLSearchParams({ date, startTime });
  return api<PublicGuide[]>(
    `/routes/${encodeURIComponent(slug)}/guides?${query}`,
  );
}

export const listRouteDepartures = (slug: string) =>
  api<Page<PublicDeparture>>(
    `/departures?routeSlug=${encodeURIComponent(slug)}&limit=20`,
  );

export const joinDeparture = (id: string, peopleCount: number) =>
  post<TouristBooking>(`/departures/${id}/bookings`, { peopleCount });

export const startPayment = (bookingId: string) =>
  post<StartedPayment>(`/bookings/${bookingId}/payments`, {
    acceptTerms: true,
  });

export const capturePayment = (bookingId: string, paymentId: string) =>
  post(`/bookings/${bookingId}/payments/${paymentId}/capture`);

export const getCancellationPreview = (id: string) =>
  api<CancellationPreview>(`/bookings/${id}/cancellation-preview`);

export const cancelMyBooking = (id: string, reason?: string) =>
  post(`/bookings/${id}/cancel`, reason ? { reason } : {});

export const confirmMyTour = (id: string) =>
  post<TouristBooking>(`/bookings/${id}/start`);

export const reportNoShow = (id: string, description: string) =>
  post(`/bookings/${id}/no-show`, { description });

export const listMyReschedules = (id: string) =>
  api<Reschedule[]>(`/bookings/${id}/reschedules`);

export const acceptReschedule = (id: string, rescheduleId: string) =>
  post(`/bookings/${id}/reschedules/${rescheduleId}/accept`);

export const rejectReschedule = (id: string, rescheduleId: string) =>
  post(`/bookings/${id}/reschedules/${rescheduleId}/reject`);

export const getMyReview = (id: string) =>
  orNull(api<MyReview>(`/bookings/${id}/review`));

export const createReview = (
  id: string,
  body: { rating: number; comment?: string },
) => post<MyReview>(`/bookings/${id}/review`, body);

export const getMyComplaint = (id: string) =>
  orNull(api<MyComplaint>(`/bookings/${id}/complaints`));

export const createComplaint = (
  id: string,
  body: { description: string; reason: 'GENERAL' | 'NO_SHOW' },
) => post<MyComplaint>(`/bookings/${id}/complaints`, body);

export const listMyHelp = (id: string) =>
  api<MyHelpRequest[]>(`/bookings/${id}/help`);

export const askForHelp = (id: string, description: string) =>
  post<MyHelpRequest>(`/bookings/${id}/help`, { description });

export function bookingStartTime(booking: {
  tourDate: string;
  startTime: string;
}) {
  return new Date(
    `${booking.tourDate}T${booking.startTime.slice(0, 5)}:00-04:00`,
  );
}
