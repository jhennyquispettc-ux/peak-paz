import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { RouteDetail, RouteSummary } from '../api/types';

const LA_PAZ: L.LatLngTuple = [-16.5, -68.13];
const ROUTE_CASING = { color: '#3B2416', weight: 11, opacity: 1, lineCap: 'round', lineJoin: 'round' } as const;
const ROUTE_ACTIVE = { color: '#FCA311', weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' } as const;
const MARKER = { radius: 7, color: '#FFFFFF', weight: 3, fillColor: '#A3284B', fillOpacity: 1 };
const MARKER_IDLE = { radius: 6, color: '#FFFFFF', weight: 2, fillColor: '#3B2416', fillOpacity: 0.7 };

interface RouteMapProps {
  routes?: RouteSummary[];
  selected?: RouteDetail | null;
  onSelect?: (slug: string) => void;
  className?: string;
}

function trackOf(route: RouteDetail): L.LatLngTuple[] {
  if (route.track?.coordinates.length) {
    return route.track.coordinates.map(([lng, lat]) => [lat, lng]);
  }
  return route.pointsOfInterest
    .filter((point) => point.isItineraryStop)
    .sort((a, b) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0))
    .map((point) => [point.latitude, point.longitude]);
}

export default function RouteMap({
  routes = [],
  selected = null,
  onSelect,
  className,
}: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { zoomControl: true }).setView(LA_PAZ, 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(instance);
    map.current = instance;
    layer.current = L.layerGroup().addTo(instance);
    return () => {
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    const group = layer.current;
    if (!instance || !group) return;
    group.clearLayers();

    for (const route of routes) {
      if (route.slug === selected?.slug) continue;
      L.circleMarker([route.startLatitude, route.startLongitude], MARKER_IDLE)
        .bindTooltip(route.nameEs)
        .on('click', () => onSelect?.(route.slug))
        .addTo(group);
    }

    if (selected) {
      const line = trackOf(selected);
      if (line.length > 1) {
        L.polyline(line, ROUTE_CASING).addTo(group);
        L.polyline(line, ROUTE_ACTIVE).addTo(group);
      }
      for (const point of selected.pointsOfInterest) {
        L.circleMarker([point.latitude, point.longitude], MARKER)
          .bindTooltip(point.nameEs)
          .addTo(group);
      }
      const bounds = L.latLngBounds(
        line.length > 0 ? line : [[selected.startLatitude, selected.startLongitude]],
      );
      instance.fitBounds(bounds.pad(0.25), { maxZoom: 14 });
    } else if (routes.length > 0) {
      instance.fitBounds(
        L.latLngBounds(routes.map((route) => [route.startLatitude, route.startLongitude])).pad(0.3),
        { maxZoom: 12 },
      );
    }
  }, [routes, selected, onSelect]);

  return <div ref={container} className={className} />;
}
