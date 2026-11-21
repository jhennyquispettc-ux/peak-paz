import type { BookingStatus } from '../lib/bookingStatus';
import { api } from './client';
import type { Page } from './types';

export type UserRole = 'TOURIST' | 'GUIDE' | 'AGENCY' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type RouteDifficulty = 'EASY' | 'MODERATE' | 'HARD';
export type AutonomyLevel =
  'SELF_GUIDED' | 'GUIDE_RECOMMENDED' | 'GUIDE_REQUIRED';
export type PointType =
  | 'START'
  | 'END'
  | 'CAMPSITE'
  | 'SHELTER'
  | 'WATER'
  | 'VIEWPOINT'
  | 'DANGER'
  | 'RUINS'
  | 'TRANSPORT';
export type GearCategory =
  'FOOD' | 'WATER' | 'CLOTHING' | 'EQUIPMENT' | 'FIRST_AID';
export type SpeciesKind = 'FLORA' | 'FAUNA';
export type PayoutStage = 'WAITING' | 'READY' | 'ON_HOLD' | 'PAID';

export interface AdminUser {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  country: string | null;
  language: 'es' | 'en';
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface AdminBooking {
  id: string;
  code: string;
  type: 'PRIVATE' | 'GROUP';
  status: BookingStatus;
  route: { id: string; slug: string; nameEs: string; days: number };
  guide: { id: string; firstName: string; lastName: string } | null;
  agency: { id: string; legalName: string } | null;
  tourist: {
    firstName: string;
    lastName: string;
    country: string | null;
    email: string | null;
    phone: string | null;
  };
  tourDate: string;
  endDate: string;
  startTime: string;
  peopleCount: number;
  totalAmount: number;
  confirmedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  reconfirmedAt: string | null;
  guideStartedAt: string | null;
  touristStartedAt: string | null;
  createdAt: string;
}

export interface AdminPayout {
  id: string;
  bookingId: string;
  bookingCode: string;
  tourDate: string | null;
  routeNameEs: string | null;
  providerName: string | null;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  penaltyDeduction: number;
  netAmount: number;
  status: 'PENDING' | 'PAID';
  stage: PayoutStage;
  payableAt: string;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminReview {
  id: string;
  rating: number;
  comment: string | null;
  touristFirstName: string | null;
  touristCountry: string | null;
  routeNameEs: string | null;
  tourDate: string | null;
  createdAt: string;
  bookingId: string;
  providerKind: 'GUIDE' | 'AGENCY';
  guideName: string | null;
  agencyName: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
}

export interface Setting {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export interface RouteRow {
  id: string;
  slug: string;
  nameEs: string;
  nameEn: string;
  difficulty: RouteDifficulty;
  autonomyLevel: AutonomyLevel;
  days: number;
  distanceKm: number;
  privatePrice: number;
  groupMinPrice: number;
  isPublished: boolean;
}

export interface RoutePoint {
  id: string;
  type: PointType;
  nameEs: string;
  nameEn: string;
  descriptionEs: string | null;
  descriptionEn: string | null;
  latitude: number;
  longitude: number;
  altitudeM: number | null;
  isItineraryStop: boolean;
  stageOrder: number | null;
  dayNumber: number | null;
  minutesFromPrevious: number | null;
  isOvernight: boolean;
}

export interface RouteGear {
  id: string;
  category: GearCategory;
  descriptionEs: string;
  descriptionEn: string;
  estimatedWeightG: number | null;
  isRequired: boolean;
}

export interface RoutePhoto {
  id: string;
  url: string;
  credit: string | null;
  sortOrder: number;
}

export interface Species {
  id: string;
  commonNameEs: string;
  commonNameEn: string;
  scientificName: string | null;
  kind: SpeciesKind;
  photoUrl: string | null;
}

export interface RouteDetail extends RouteRow {
  descriptionEs: string;
  descriptionEn: string;
  elevationGainM: number;
  elevationLossM: number;
  maxAltitudeM: number;
  startTimeFrom: string;
  startTimeTo: string;
  howToGetThereEs: string;
  howToGetThereEn: string;
  bestSeasonEs: string | null;
  bestSeasonEn: string | null;
  emergencyContacts: string;
  startLatitude: number;
  startLongitude: number;
  privateMaxPeople: number;
  groupMaxPeople: number;
  track: { coordinates: number[][] } | null;
  pointsOfInterest: RoutePoint[];
  gearRecommendations: RouteGear[];
  photos: RoutePhoto[];
  species: Species[];
}

export interface GuideRouteRequest {
  id: string;
  routeId: string;
  routeNameEs: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedAt: string | null;
  guideProfileId: string;
  guideName: string;
  guideVerificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export type RoutePayload = Omit<
  RouteDetail,
  | 'id'
  | 'slug'
  | 'isPublished'
  | 'track'
  | 'pointsOfInterest'
  | 'gearRecommendations'
  | 'photos'
  | 'species'
  | 'bestSeasonEs'
  | 'bestSeasonEn'
> & { bestSeasonEs?: string; bestSeasonEn?: string };

export type PointPayload = Omit<
  RoutePoint,
  | 'id'
  | 'descriptionEs'
  | 'descriptionEn'
  | 'altitudeM'
  | 'stageOrder'
  | 'dayNumber'
  | 'minutesFromPrevious'
> & {
  descriptionEs?: string;
  descriptionEn?: string;
  altitudeM?: number;
  stageOrder?: number;
  dayNumber?: number;
  minutesFromPrevious?: number;
};

export type GearPayload = Omit<RouteGear, 'id' | 'estimatedWeightG'> & {
  estimatedWeightG?: number;
};

export type SpeciesPayload = Omit<
  Species,
  'id' | 'scientificName' | 'photoUrl'
> & { scientificName?: string; photoUrl?: string };

function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

function send<T>(path: string, method: string, body?: unknown) {
  return api<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const listUsers = (filters: {
  page: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}) => api<Page<AdminUser>>(`/users?${query({ ...filters, limit: 15 })}`);

export const setUserStatus = (id: string, status: UserStatus) =>
  send<AdminUser>(`/users/${id}/status`, 'PATCH', { status });

export const listBookings = (filters: {
  page: number;
  status?: BookingStatus;
  type?: 'PRIVATE' | 'GROUP';
}) =>
  api<Page<AdminBooking>>(
    `/admin/bookings?${query({ ...filters, limit: 15 })}`,
  );

export const listPayouts = (status: 'PENDING' | 'PAID', page: number) =>
  api<Page<AdminPayout>>(
    `/admin/payouts?${query({ status, page, limit: 15 })}`,
  );

export const markPayoutPaid = (id: string) =>
  send<AdminPayout>(`/admin/payouts/${id}/paid`, 'PATCH');

export const listReviews = (hidden: boolean, page: number) =>
  api<Page<AdminReview>>(
    `/admin/reviews?${query({ hidden, page, limit: 15 })}`,
  );

export const setReviewVisibility = (
  id: string,
  hidden: boolean,
  reason?: string,
) =>
  send<AdminReview>(`/admin/reviews/${id}/visibility`, 'PATCH', {
    hidden,
    ...(hidden ? { reason } : {}),
  });

export const listSettings = () => api<Setting[]>('/admin/settings');

export const updateSetting = (key: string, value: number) =>
  send<Setting>(`/admin/settings/${key}`, 'PATCH', { value });

export const listRoutes = (filters: {
  page: number;
  search?: string;
  isPublished?: boolean;
}) => api<Page<RouteRow>>(`/admin/routes?${query({ ...filters, limit: 15 })}`);

export const getRoute = (id: string) => api<RouteDetail>(`/admin/routes/${id}`);

export const createRoute = (body: RoutePayload) =>
  send<RouteDetail>('/admin/routes', 'POST', body);

export const updateRoute = (id: string, body: RoutePayload) =>
  send<RouteDetail>(`/admin/routes/${id}`, 'PATCH', body);

export const deleteRoute = (id: string) =>
  send<void>(`/admin/routes/${id}`, 'DELETE');

export const setRoutePublished = (id: string, isPublished: boolean) =>
  send<RouteDetail>(`/admin/routes/${id}/publication`, 'PATCH', {
    isPublished,
  });

export function uploadTrack(id: string, file: File) {
  const body = new FormData();
  body.set('file', file);
  return api<{ points: number; distanceKm: number }>(
    `/admin/routes/${id}/track`,
    { method: 'POST', body },
  );
}

export const savePoint = (
  routeId: string,
  pointId: string | null,
  body: PointPayload,
) =>
  pointId
    ? send<RoutePoint>(
        `/admin/routes/${routeId}/points/${pointId}`,
        'PATCH',
        body,
      )
    : send<RoutePoint>(`/admin/routes/${routeId}/points`, 'POST', body);

export const deletePoint = (routeId: string, pointId: string) =>
  send<void>(`/admin/routes/${routeId}/points/${pointId}`, 'DELETE');

export const saveGear = (
  routeId: string,
  gearId: string | null,
  body: GearPayload,
) =>
  gearId
    ? send<RouteGear>(`/admin/routes/${routeId}/gear/${gearId}`, 'PATCH', body)
    : send<RouteGear>(`/admin/routes/${routeId}/gear`, 'POST', body);

export const deleteGear = (routeId: string, gearId: string) =>
  send<void>(`/admin/routes/${routeId}/gear/${gearId}`, 'DELETE');

export const addPhoto = (
  routeId: string,
  body: { url: string; publicId: string; credit?: string; sortOrder: number },
) => send<RoutePhoto>(`/admin/routes/${routeId}/photos`, 'POST', body);

export const deletePhoto = (routeId: string, photoId: string) =>
  send<void>(`/admin/routes/${routeId}/photos/${photoId}`, 'DELETE');

export const setRouteSpecies = (routeId: string, speciesIds: string[]) =>
  send<Species[]>(`/admin/routes/${routeId}/species`, 'PUT', { speciesIds });

export const listSpecies = () => api<Species[]>('/admin/species');

export const saveSpecies = (id: string | null, body: SpeciesPayload) =>
  id
    ? send<Species>(`/admin/species/${id}`, 'PATCH', body)
    : send<Species>('/admin/species', 'POST', body);

export const deleteSpecies = (id: string) =>
  send<void>(`/admin/species/${id}`, 'DELETE');

export const listGuideRoutes = (
  status: GuideRouteRequest['status'],
  page: number,
) =>
  api<Page<GuideRouteRequest>>(
    `/admin/guide-routes?${query({ status, page, limit: 15 })}`,
  );

export const decideGuideRoute = (id: string, status: 'APPROVED' | 'REJECTED') =>
  send<GuideRouteRequest>(`/admin/guide-routes/${id}`, 'PATCH', { status });
