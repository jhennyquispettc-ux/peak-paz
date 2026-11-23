export type Difficulty = 'EASY' | 'MODERATE' | 'HARD';

export interface User {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  firstName: string;
  lastName: string;
  role: 'TOURIST' | 'GUIDE' | 'AGENCY' | 'ADMIN';
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface RouteSummary {
  id: string;
  slug: string;
  nameEs: string;
  nameEn: string;
  difficulty: Difficulty;
  days: number;
  distanceKm: number;
  elevationGainM: number;
  maxAltitudeM: number;
  privatePrice: number;
  groupMinPrice: number;
  coverPhotoUrl: string | null;
  startLatitude: number;
  startLongitude: number;
}

export type Position = [number, number] | [number, number, number];

export interface PointOfInterest {
  id: string;
  type: string;
  nameEs: string;
  latitude: number;
  longitude: number;
  altitudeM: number | null;
  isItineraryStop: boolean;
  stageOrder: number | null;
  dayNumber: number | null;
}

export interface RouteDetail extends RouteSummary {
  descriptionEs: string;
  descriptionEn: string;
  howToGetThereEn: string;
  bestSeasonEn: string | null;
  elevationLossM: number;
  startTimeFrom: string;
  startTimeTo: string;
  howToGetThereEs: string;
  bestSeasonEs: string | null;
  emergencyContacts: string;
  privateMaxPeople: number;
  track: { type: 'LineString'; coordinates: Position[] } | null;
  pointsOfInterest: PointOfInterest[];
  gearRecommendations: {
    id: string;
    descriptionEs: string;
    descriptionEn: string;
    isRequired: boolean;
  }[];
}

export interface Itinerary {
  startTime: string;
  suggestedStartFrom: string;
  suggestedStartTo: string;
  days: {
    dayNumber: number;
    startTime: string;
    endTime: string;
    walkingMinutes: number;
  }[];
  stops: {
    stageOrder: number;
    dayNumber: number;
    nameEs: string;
    nameEn: string;
    arrivalTime: string;
    minutesFromPrevious: number;
    isOvernight: boolean;
  }[];
}

export interface WeatherForecast {
  days: {
    date: string;
    weatherCode: number;
    temperatureMaxC: number;
    temperatureMinC: number;
    precipitationProbability: number | null;
  }[];
}

export interface PublicGuide {
  id: string;
  firstName: string;
  lastName: string;
  credentialType: 'SIRETUR' | 'FEBOGUIT' | null;
  languages: string[];
  yearsExperience: number;
  ratingAverage: number;
  reviewsCount: number;
}
