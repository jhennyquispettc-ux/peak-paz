import { NotFoundException } from '@nestjs/common';

export class NotificationNotFoundException extends NotFoundException {
  constructor() {
    super({
      error: 'NOTIFICATION_NOT_FOUND',
      message: 'Notification not found.',
    });
  }
}
