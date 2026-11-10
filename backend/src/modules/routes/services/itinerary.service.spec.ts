import { PointOfInterest } from '../entities/point-of-interest.entity.js';
import { Route } from '../entities/route.entity.js';
import { StartTimeOutsideWindowException } from '../exceptions/routes.exceptions.js';
import { PointOfInterestType } from '../routes.enums.js';
import { ItineraryService, toClock, toMinutes } from './itinerary.service.js';

function stop(
  stageOrder: number,
  dayNumber: number,
  minutesFromPrevious: number,
  isOvernight = false,
): PointOfInterest {
  return Object.assign(new PointOfInterest(), {
    type: PointOfInterestType.CAMPSITE,
    nameEs: `Parada ${stageOrder}`,
    nameEn: `Stop ${stageOrder}`,
    isItineraryStop: true,
    stageOrder,
    dayNumber,
    minutesFromPrevious,
    isOvernight,
  });
}

describe('ItineraryService', () => {
  const service = new ItineraryService();
  const route = Object.assign(new Route(), {
    id: 'route-1',
    startTimeFrom: '06:00:00',
    startTimeTo: '08:00:00',
  });

  it('converts between clock text and minutes', () => {
    expect(toMinutes('07:30')).toBe(450);
    expect(toClock(450)).toBe('07:30');
    expect(toClock(1500)).toBe('01:00');
  });

  it('adds walking minutes stop by stop and restarts each day', () => {
    const points = [
      stop(3, 2, 0),
      stop(1, 1, 0),
      stop(2, 1, 240, true),
      stop(4, 2, 300),
    ];

    const itinerary = service.build(route, points, '07:00');

    expect(itinerary.stops.map((item) => item.arrivalTime)).toEqual([
      '07:00',
      '11:00',
      '07:00',
      '12:00',
    ]);
    expect(itinerary.days).toEqual([
      {
        dayNumber: 1,
        startTime: '07:00',
        endTime: '11:00',
        walkingMinutes: 240,
      },
      {
        dayNumber: 2,
        startTime: '07:00',
        endTime: '12:00',
        walkingMinutes: 300,
      },
    ]);
  });

  it('uses the start of the suggested window when no time is given', () => {
    const itinerary = service.build(route, [stop(1, 1, 0)]);
    expect(itinerary.startTime).toBe('06:00');
    expect(itinerary.suggestedStartTo).toBe('08:00');
  });

  it('rejects a start time outside the suggested window', () => {
    expect(() => service.build(route, [], '09:15')).toThrow(
      StartTimeOutsideWindowException,
    );
  });
});
