import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class CancellationReviewNotFoundException extends NotFoundException {
  constructor() {
    super({
      error: 'CANCELLATION_REVIEW_NOT_FOUND',
      message: 'Cancellation review not found.',
    });
  }
}

export class CancellationReviewResolvedException extends ConflictException {
  constructor() {
    super({
      error: 'CANCELLATION_REVIEW_RESOLVED',
      message: 'This cancellation was already reviewed.',
    });
  }
}

export class EvidenceNotFoundException extends NotFoundException {
  constructor() {
    super({
      error: 'EVIDENCE_NOT_FOUND',
      message: 'The guide did not attach any evidence to this cancellation.',
    });
  }
}

export class FinePercentRequiredException extends BadRequestException {
  constructor() {
    super({
      error: 'FINE_PERCENT_REQUIRED',
      message: 'A strike with a fine needs the fine percentage.',
    });
  }
}

export class FineNotAllowedException extends BadRequestException {
  constructor() {
    super({
      error: 'FINE_NOT_ALLOWED',
      message: 'A fine percentage is only accepted with STRIKE_AND_FINE.',
    });
  }
}

export class FineTooHighException extends BadRequestException {
  constructor(maxPercent: number) {
    super({
      error: 'FINE_TOO_HIGH',
      message: `The fine cannot be higher than ${maxPercent}% of the booking.`,
    });
  }
}

export class StrikeNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'STRIKE_NOT_FOUND', message: 'Strike not found.' });
  }
}

export class StrikeNotActiveException extends ConflictException {
  constructor() {
    super({
      error: 'STRIKE_NOT_ACTIVE',
      message: 'Only an active strike can be reverted.',
    });
  }
}
