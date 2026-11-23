import { ServiceUnavailableException } from '@nestjs/common';

export class MessagingUnavailableException extends ServiceUnavailableException {
  constructor() {
    super({
      error: 'MESSAGING_UNAVAILABLE',
      message: 'The verification service did not answer through RabbitMQ.',
    });
  }
}
