import { api } from './client';
import type {
  Difficulty,
  Itinerary,
  Page,
  PublicGuide,
  RouteDetail,
  RouteSummary,
  WeatherForecast,
} from './types';

export function listRoutes(filters: {
  difficulty?: Difficulty;
  search?: string;
}): Promise<Page<RouteSummary>> {
  const query = new URLSearchParams({ limit: '100' });
  if (filters.difficulty) query.set('difficulty', filters.difficulty);
  if (filters.search) query.set('search', filters.search);
  return api(`/routes?${query.toString()}`);
}

export function getRoute(slug: string): Promise<RouteDetail> {
  return api(`/routes/${encodeURIComponent(slug)}`);
}

export function getItinerary(
  slug: string,
  startTime: string,
): Promise<Itinerary> {
  return api(
    `/routes/${encodeURIComponent(slug)}/itinerary?startTime=${startTime}`,
  );
}

export function getWeather(slug: string): Promise<WeatherForecast> {
  return api(`/routes/${encodeURIComponent(slug)}/weather`);
}

export function getRouteGuides(slug: string): Promise<PublicGuide[]> {
  return api(`/routes/${encodeURIComponent(slug)}/guides`);
}
