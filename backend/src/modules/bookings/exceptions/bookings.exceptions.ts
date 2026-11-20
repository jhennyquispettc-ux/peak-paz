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

export class ReconfirmationNotOpenException extends ConflictException {
  constructor() {
    super({
      error: 'RECONFIRMATION_NOT_OPEN',
      message:
        'The booking can only be reconfirmed during the 72 hours before the start.',
    });
  }
}

export class AlreadyReconfirmedException extends ConflictException {
  constructor() {
    super({
      error: 'ALREADY_RECONFIRMED',
      message: 'This booking was already reconfirmed.',
    });
  }
}

export class StartWindowClosedException extends ConflictException {
  constructor() {
    super({
      error: 'START_WINDOW_CLOSED',
      message:
        'The start can only be marked from one hour before the tour until it ends.',
    });
  }
}

export class AlreadyStartedException extends ConflictException {
  constructor() {
    super({
      error: 'ALREADY_STARTED',
      message: 'The start of this tour was already confirmed.',
    });
  }
}

export class NoShowReportTooEarlyException extends ConflictException {
  constructor() {
    super({
      error: 'NO_SHOW_REPORT_NOT_ALLOWED',
      message:
        'A no show can be reported only after the waiting time and while the guide has not started the tour.',
    });
  }
}

export class DisputeAlreadyOpenException extends ConflictException {
  constructor() {
    super({
      error: 'DISPUTE_ALREADY_OPEN',
      message: 'This booking already has a dispute.',
    });
  }
}

export class DisputeNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'DISPUTE_NOT_FOUND', message: 'Dispute not found.' });
  }
}

export class DisputeResolvedException extends ConflictException {
  constructor() {
    super({
      error: 'DISPUTE_RESOLVED',
      message: 'This dispute was already resolved.',
    });
  }
}
