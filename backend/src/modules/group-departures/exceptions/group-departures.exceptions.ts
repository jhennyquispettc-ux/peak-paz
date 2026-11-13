import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class DepartureNotFoundException extends NotFoundException {
  constructor() {
    super({
      error: 'DEPARTURE_NOT_FOUND',
      message: 'Group departure not found.',
    });
  }
}

export class DepartureClosedException extends ConflictException {
  constructor() {
    super({
      error: 'DEPARTURE_CLOSED',
      message: 'This departure no longer accepts sign ups.',
    });
  }
}

export class NotEnoughSeatsException extends ConflictException {
  constructor(left: number) {
    super({
      error: 'NOT_ENOUGH_SEATS',
      message: `Only ${left} seats are left in this departure.`,
    });
  }
}

export class AlreadyJoinedException extends ConflictException {
  constructor() {
    super({
      error: 'ALREADY_JOINED',
      message: 'You already have an open booking in this departure.',
    });
  }
}

export class PriceBelowMinimumException extends BadRequestException {
  constructor(minimum: number) {
    super({
      error: 'PRICE_BELOW_MINIMUM',
      message: `The price per person must be at least ${minimum} for this route.`,
    });
  }
}

export class InvalidGroupSizeException extends BadRequestException {
  constructor(message: string) {
    super({ error: 'INVALID_GROUP_SIZE', message });
  }
}

export class DepartureTooSoonException extends BadRequestException {
  constructor(hours: number) {
    super({
      error: 'DEPARTURE_TOO_SOON',
      message: `A departure must be published more than ${hours} hours before it starts.`,
    });
  }
}
