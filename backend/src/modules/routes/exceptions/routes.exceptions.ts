import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

export class RouteNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'ROUTE_NOT_FOUND', message: 'Route not found.' });
  }
}

export class PointOfInterestNotFoundException extends NotFoundException {
  constructor() {
    super({
      error: 'POINT_OF_INTEREST_NOT_FOUND',
      message: 'Point of interest not found in this route.',
    });
  }
}

export class GearRecommendationNotFoundException extends NotFoundException {
  constructor() {
    super({
      error: 'GEAR_RECOMMENDATION_NOT_FOUND',
      message: 'Gear recommendation not found in this route.',
    });
  }
}

export class RoutePhotoNotFoundException extends NotFoundException {
  constructor() {
    super({
      error: 'ROUTE_PHOTO_NOT_FOUND',
      message: 'Photo not found in this route.',
    });
  }
}

export class SpeciesNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'SPECIES_NOT_FOUND', message: 'Species not found.' });
  }
}

export class RouteNotReadyException extends BadRequestException {
  constructor(minStops: number) {
    super({
      error: 'ROUTE_NOT_READY',
      message: `A route needs at least ${minStops} itinerary stops before it can be published.`,
    });
  }
}

export class InvalidStartWindowException extends BadRequestException {
  constructor() {
    super({
      error: 'INVALID_START_WINDOW',
      message: 'startTimeFrom must be earlier than startTimeTo.',
    });
  }
}

export class StartTimeOutsideWindowException extends BadRequestException {
  constructor(from: string, to: string) {
    super({
      error: 'START_TIME_OUTSIDE_WINDOW',
      message: `The start time must be between ${from} and ${to}.`,
    });
  }
}

export class InvalidItineraryStopException extends BadRequestException {
  constructor() {
    super({
      error: 'INVALID_ITINERARY_STOP',
      message:
        'An itinerary stop needs stageOrder, dayNumber and minutesFromPrevious. Other points must leave them empty.',
    });
  }
}

export class GpxFileRequiredException extends BadRequestException {
  constructor() {
    super({
      error: 'GPX_FILE_REQUIRED',
      message: 'Send the GPX file in the "file" field.',
    });
  }
}

export class InvalidGpxException extends BadRequestException {
  constructor(reason: string) {
    super({ error: 'INVALID_GPX', message: reason });
  }
}

export class WeatherUnavailableException extends ServiceUnavailableException {
  constructor() {
    super({
      error: 'WEATHER_UNAVAILABLE',
      message: 'The weather forecast is not available right now.',
    });
  }
}
