import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class ReviewNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'REVIEW_NOT_FOUND', message: 'Review not found.' });
  }
}

export class ReviewAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      error: 'REVIEW_ALREADY_EXISTS',
      message: 'This tour was already reviewed.',
    });
  }
}

export class ReviewWindowClosedException extends ConflictException {
  constructor(days: number) {
    super({
      error: 'REVIEW_WINDOW_CLOSED',
      message: `A tour can be reviewed once it ends and up to ${days} days later.`,
    });
  }
}

export class HiddenReasonRequiredException extends BadRequestException {
  constructor() {
    super({
      error: 'HIDDEN_REASON_REQUIRED',
      message: 'A reason is required to hide a review.',
    });
  }
}
