import { Injectable } from '@nestjs/common';
import {
  ItineraryDayDto,
  ItineraryDto,
  ItineraryStopDto,
} from '../dto/itinerary.dto.js';
import { PointOfInterest } from '../entities/point-of-interest.entity.js';
import { Route } from '../entities/route.entity.js';
import { StartTimeOutsideWindowException } from '../exceptions/routes.exceptions.js';

const MINUTES_PER_DAY = 24 * 60;

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toClock(totalMinutes: number): string {
  const minutesOfDay =
    ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

@Injectable()
export class ItineraryService {
  build(
    route: Route,
    points: PointOfInterest[],
    requestedStart?: string,
  ): ItineraryDto {
    const windowFrom = route.startTimeFrom.slice(0, 5);
    const windowTo = route.startTimeTo.slice(0, 5);
    const startTime = requestedStart ?? windowFrom;
    const start = toMinutes(startTime);

    if (start < toMinutes(windowFrom) || start > toMinutes(windowTo)) {
      throw new StartTimeOutsideWindowException(windowFrom, windowTo);
    }

    const stops = points
      .filter((point) => point.isItineraryStop)
      .sort((a, b) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0));

    const itineraryStops: ItineraryStopDto[] = [];
    const days = new Map<number, ItineraryDayDto>();
    let clock = start;
    let currentDay: number | null = null;

    for (const stop of stops) {
      const dayNumber = stop.dayNumber ?? 1;
      if (dayNumber !== currentDay) {
        currentDay = dayNumber;
        clock = start;
      }
      const minutesFromPrevious = stop.minutesFromPrevious ?? 0;
      clock += minutesFromPrevious;

      itineraryStops.push({
        stageOrder: stop.stageOrder ?? 0,
        dayNumber,
        type: stop.type,
        nameEs: stop.nameEs,
        nameEn: stop.nameEn,
        minutesFromPrevious,
        arrivalTime: toClock(clock),
        isOvernight: stop.isOvernight,
      });

      days.set(dayNumber, {
        dayNumber,
        startTime,
        endTime: toClock(clock),
        walkingMinutes: clock - start,
      });
    }

    return {
      routeId: route.id,
      startTime,
      suggestedStartFrom: windowFrom,
      suggestedStartTo: windowTo,
      days: [...days.values()],
      stops: itineraryStops,
    };
  }
}
