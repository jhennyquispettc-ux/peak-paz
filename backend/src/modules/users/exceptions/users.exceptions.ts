import { BadRequestException, NotFoundException } from '@nestjs/common';

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'USER_NOT_FOUND', message: 'User not found.' });
  }
}

export class CannotChangeOwnStatusException extends BadRequestException {
  constructor() {
    super({
      error: 'CANNOT_CHANGE_OWN_STATUS',
      message: 'An admin cannot change the status of their own account.',
    });
  }
}
