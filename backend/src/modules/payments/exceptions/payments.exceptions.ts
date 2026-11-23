import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

export class PaymentNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'PAYMENT_NOT_FOUND', message: 'Payment not found.' });
  }
}

export class PayoutNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'PAYOUT_NOT_FOUND', message: 'Payout not found.' });
  }
}

export class PaymentWindowClosedException extends ConflictException {
  constructor() {
    super({
      error: 'PAYMENT_WINDOW_CLOSED',
      message: 'The time to pay this booking has already passed.',
    });
  }
}

export class PaymentNotCompletedException extends ConflictException {
  constructor() {
    super({
      error: 'PAYMENT_NOT_COMPLETED',
      message:
        'The payment was not approved or was declined. No money was charged.',
    });
  }
}

export class PaymentProviderException extends BadGatewayException {
  constructor() {
    super({
      error: 'PAYMENT_PROVIDER_ERROR',
      message: 'The payment provider did not answer. Try again in a moment.',
    });
  }
}

export class TourAlreadyStartedException extends ConflictException {
  constructor() {
    super({
      error: 'TOUR_ALREADY_STARTED',
      message: 'A booking cannot be cancelled once the tour has started.',
    });
  }
}

export class PayoutAlreadyPaidException extends ConflictException {
  constructor() {
    super({
      error: 'PAYOUT_ALREADY_PAID',
      message: 'This payout was already marked as paid.',
    });
  }
}

export class PayoutOnHoldException extends ConflictException {
  constructor() {
    super({
      error: 'PAYOUT_ON_HOLD',
      message: 'This payout waits until the open complaint is resolved.',
    });
  }
}

export class PayoutNotReadyException extends ConflictException {
  constructor(payableAt: Date) {
    super({
      error: 'PAYOUT_NOT_READY',
      message: `This payout can be paid from ${payableAt.toISOString()}.`,
    });
  }
}

export class ComplaintNotResolvableException extends ConflictException {
  constructor() {
    super({
      error: 'COMPLAINT_TOUR_RUNNING',
      message: 'This complaint can be decided when the tour is closed.',
    });
  }
}

export class ComplaintNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'COMPLAINT_NOT_FOUND', message: 'Complaint not found.' });
  }
}

export class ComplaintAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      error: 'COMPLAINT_ALREADY_EXISTS',
      message: 'This tour already has a complaint.',
    });
  }
}

export class ComplaintWindowClosedException extends ConflictException {
  constructor(hours: number) {
    super({
      error: 'COMPLAINT_WINDOW_CLOSED',
      message: `A complaint can be made once the tour ends and up to ${hours} hours later.`,
    });
  }
}

export class ComplaintResolvedException extends ConflictException {
  constructor() {
    super({
      error: 'COMPLAINT_RESOLVED',
      message: 'This complaint was already resolved.',
    });
  }
}

export class RefundPercentRequiredException extends BadRequestException {
  constructor() {
    super({
      error: 'REFUND_PERCENT_REQUIRED',
      message:
        'An accepted complaint needs the refund percentage, even if it is 0.',
    });
  }
}

export class ComplaintOptionsNotAllowedException extends BadRequestException {
  constructor() {
    super({
      error: 'COMPLAINT_OPTIONS_NOT_ALLOWED',
      message: 'A rejected complaint cannot have a refund or a strike.',
    });
  }
}
