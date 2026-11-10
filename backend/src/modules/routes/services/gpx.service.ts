import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { TrackSummaryDto } from '../dto/track-summary.dto.js';
import { InvalidGpxException } from '../exceptions/routes.exceptions.js';
import type { LineString, Position } from '../types/line-string.js';

const EARTH_RADIUS_KM = 6371;
const ELEVATION_THRESHOLD_M = 5;
const MAX_POINTS = 20000;
const LIST_TAGS = new Set(['trk', 'trkseg', 'trkpt', 'rte', 'rtept']);

interface GpxPoint {
  lat?: string;
  lon?: string;
  ele?: number | string;
}

interface GpxDocument {
  gpx?: {
    trk?: { trkseg?: { trkpt?: GpxPoint[] }[] }[];
    rte?: { rtept?: GpxPoint[] }[];
  };
}

export interface ParsedTrack {
  track: LineString;
  summary: TrackSummaryDto;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(a: Position, b: Position): number {
  const deltaLat = toRadians(b[1] - a[1]);
  const deltaLon = toRadians(b[0] - a[0]);
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(a[1])) *
      Math.cos(toRadians(b[1])) *
      Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

@Injectable()
export class GpxService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    removeNSPrefix: true,
    processEntities: false,
    isArray: (name) => LIST_TAGS.has(name),
  });

  parse(content: Buffer): ParsedTrack {
    const coordinates = this.readCoordinates(content.toString('utf8'));
    const summary = this.summarize(coordinates);
    if (summary.distanceKm < 0.1) {
      throw new InvalidGpxException('The track is shorter than 100 meters.');
    }
    return { track: { type: 'LineString', coordinates }, summary };
  }

  summarize(coordinates: Position[]): TrackSummaryDto {
    let distanceKm = 0;
    let gain = 0;
    let loss = 0;
    let maxAltitude: number | null = null;
    let reference: number | null = null;

    for (let index = 0; index < coordinates.length; index++) {
      const position = coordinates[index];
      if (index > 0) {
        distanceKm += haversineKm(coordinates[index - 1], position);
      }

      const elevation = position[2];
      if (elevation === undefined) continue;

      maxAltitude =
        maxAltitude === null ? elevation : Math.max(maxAltitude, elevation);

      if (reference === null) {
        reference = elevation;
        continue;
      }
      const delta = elevation - reference;
      if (Math.abs(delta) >= ELEVATION_THRESHOLD_M) {
        if (delta > 0) gain += delta;
        else loss -= delta;
        reference = elevation;
      }
    }

    return {
      points: coordinates.length,
      distanceKm: Math.round(distanceKm * 10) / 10,
      elevationGainM: Math.round(gain),
      elevationLossM: Math.round(loss),
      maxAltitudeM: maxAltitude === null ? null : Math.round(maxAltitude),
    };
  }

  private readCoordinates(xml: string): Position[] {
    let document: GpxDocument;
    try {
      document = this.parser.parse(xml, true) as GpxDocument;
    } catch {
      throw new InvalidGpxException('The file is not valid XML.');
    }

    if (!document.gpx) {
      throw new InvalidGpxException('The file has no <gpx> root element.');
    }

    const trackPoints = (document.gpx.trk ?? []).flatMap((track) =>
      (track.trkseg ?? []).flatMap((segment) => segment.trkpt ?? []),
    );
    const routePoints = (document.gpx.rte ?? []).flatMap(
      (route) => route.rtept ?? [],
    );
    const points = trackPoints.length > 0 ? trackPoints : routePoints;

    if (points.length < 2) {
      throw new InvalidGpxException(
        'The file needs at least 2 track or route points.',
      );
    }
    if (points.length > MAX_POINTS) {
      throw new InvalidGpxException(
        `The file has more than ${MAX_POINTS} points.`,
      );
    }

    return points.map((point) => this.toPosition(point));
  }

  private toPosition(point: GpxPoint): Position {
    const latitude = Number(point.lat);
    const longitude = Number(point.lon);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      throw new InvalidGpxException('A point has invalid coordinates.');
    }

    const lon = Math.round(longitude * 1e6) / 1e6;
    const lat = Math.round(latitude * 1e6) / 1e6;
    const elevation = Number(point.ele);
    if (point.ele === undefined || !Number.isFinite(elevation)) {
      return [lon, lat];
    }
    return [lon, lat, Math.round(elevation * 10) / 10];
  }
}
