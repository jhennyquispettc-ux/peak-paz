import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  addDays,
  addMinutes,
  laPazInstant,
} from '../../../common/time/la-paz-time.js';
import { ItineraryDto } from '../dto/itinerary.dto.js';
import { PointOfInterest } from '../entities/point-of-interest.entity.js';
import { Route } from '../entities/route.entity.js';
import { ItineraryService } from './itinerary.service.js';

export interface TourInterval {
  startsAt: Date;
  endsAt: Date;
}

export function tourInterval(
  route: Route,
  itinerary: ItineraryDto,
  tourDate: string,
  startTime: string,
): TourInterval {
  const startsAt = laPazInstant(tourDate, startTime);
  const endOfLastDay = laPazInstant(addDays(tourDate, route.days), '00:00');
  const lastDay = itinerary.days.at(-1);

  if (!lastDay || lastDay.dayNumber !== route.days) {
    return { startsAt, endsAt: endOfLastDay };
  }
  const endsAt = addMinutes(
    laPazInstant(addDays(tourDate, lastDay.dayNumber - 1), startTime),
    lastDay.walkingMinutes,
  );
  return { startsAt, endsAt: endsAt > startsAt ? endsAt : endOfLastDay };
}

@Injectable()
export class TourIntervalService {
  constructor(
    @InjectRepository(PointOfInterest)
    private readonly points: Repository<PointOfInterest>,
    private readonly itinerary: ItineraryService,
  ) {}

  async forTour(
    route: Route,
    tourDate: string,
    startTime: string,
  ): Promise<TourInterval> {
    const stops = await this.points.find({
      where: { routeId: route.id, isItineraryStop: true },
    });
    const itinerary = this.itinerary.build(route, stops, startTime);
    return tourInterval(route, itinerary, tourDate, startTime);
  }
}
