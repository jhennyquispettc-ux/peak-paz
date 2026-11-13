import {
  BadGatewayException,
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
