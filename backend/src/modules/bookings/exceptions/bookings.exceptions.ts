import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class BookingNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'BOOKING_NOT_FOUND', message: 'Booking not found.' });
  }
}

export class GuideNotAuthorizedForRouteException extends BadRequestException {
  constructor() {
    super({
      error: 'GUIDE_NOT_AUTHORIZED_FOR_ROUTE',
      message: 'This guide is not approved to lead this route.',
    });
  }
}

export class GuideNotAvailableException extends ConflictException {
  constructor() {
    super({
      error: 'GUIDE_NOT_AVAILABLE',
      message: 'The guide is not available on that date and time.',
    });
  }
}

export class InsufficientAdvanceException extends BadRequestException {
  constructor(hours: number) {
    super({
      error: 'INSUFFICIENT_ADVANCE',
      message: `A booking must be requested at least ${hours} hours before the start.`,
    });
  }
}

export class TooManyPeopleException extends BadRequestException {
  constructor(max: number) {
    super({
      error: 'TOO_MANY_PEOPLE',
      message: `A private tour on this route allows up to ${max} people.`,
    });
  }
}

export class BookingAlreadyRequestedException extends ConflictException {
  constructor() {
    super({
      error: 'BOOKING_ALREADY_REQUESTED',
      message:
        'You already have an open request with this guide for that date.',
    });
  }
}

export class InvalidBookingStatusException extends ConflictException {
  constructor(status: string) {
    super({
      error: 'INVALID_BOOKING_STATUS',
      message: `This action is not allowed while the booking is ${status}.`,
    });
  }
}

export class ResponseWindowClosedException extends ConflictException {
  constructor() {
    super({
      error: 'RESPONSE_WINDOW_CLOSED',
      message: 'The time to answer this request has already passed.',
    });
  }
}
