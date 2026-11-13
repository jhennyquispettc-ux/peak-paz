import { busyWindow } from '../../guides/repositories/guides.repository.js';
import { ItineraryDto } from '../dto/itinerary.dto.js';
import { Route } from '../entities/route.entity.js';
import { tourInterval } from './tour-interval.service.js';

function itineraryWith(
  days: { dayNumber: number; walkingMinutes: number }[],
): ItineraryDto {
  return {
    routeId: 'route-1',
    startTime: '07:00',
    suggestedStartFrom: '06:00',
    suggestedStartTo: '08:00',
    stops: [],
    days: days.map((day) => ({
      ...day,
      startTime: '07:00',
      endTime: '00:00',
    })),
  };
}

describe('tourInterval', () => {
  const halfDay = Object.assign(new Route(), { days: 1 });
  const threeDays = Object.assign(new Route(), { days: 3 });

  it('ends a one day tour after its walking time', () => {
    const interval = tourInterval(
      halfDay,
      itineraryWith([{ dayNumber: 1, walkingMinutes: 270 }]),
      '2026-12-05',
      '07:00',
    );
    expect(interval.startsAt.toISOString()).toBe('2026-12-05T11:00:00.000Z');
    expect(interval.endsAt.toISOString()).toBe('2026-12-05T15:30:00.000Z');
  });

  it('ends a multi day tour on its last day', () => {
    const interval = tourInterval(
      threeDays,
      itineraryWith([
        { dayNumber: 1, walkingMinutes: 360 },
        { dayNumber: 2, walkingMinutes: 420 },
        { dayNumber: 3, walkingMinutes: 300 },
      ]),
      '2026-12-05',
      '07:00',
    );
    expect(interval.endsAt.toISOString()).toBe('2026-12-07T16:00:00.000Z');
  });

  it('takes the whole last day when the itinerary is incomplete', () => {
    const interval = tourInterval(
      threeDays,
      itineraryWith([{ dayNumber: 1, walkingMinutes: 360 }]),
      '2026-12-05',
      '07:00',
    );
    expect(interval.endsAt.toISOString()).toBe('2026-12-08T04:00:00.000Z');
  });

  it('widens the busy window by the margin on both sides', () => {
    const busy = busyWindow(
      {
        startsAt: new Date('2026-12-05T07:00:00Z'),
        endsAt: new Date('2026-12-05T09:00:00Z'),
      },
      120,
    );
    expect(busy.busyFrom.toISOString()).toBe('2026-12-05T05:00:00.000Z');
    expect(busy.busyUntil.toISOString()).toBe('2026-12-05T11:00:00.000Z');
  });
});
