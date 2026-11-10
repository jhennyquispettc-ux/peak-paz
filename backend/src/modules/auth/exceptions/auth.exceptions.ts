import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

export class EmailAlreadyRegisteredException extends ConflictException {
  constructor() {
    super({
      error: 'EMAIL_ALREADY_REGISTERED',
      message: 'That email is already registered.',
    });
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super({
      error: 'INVALID_CREDENTIALS',
      message: 'The email or password is incorrect.',
    });
  }
}

export class InvalidTokenException extends UnauthorizedException {
  constructor() {
    super({
      error: 'INVALID_TOKEN',
      message: 'The session token is missing, invalid or expired.',
    });
  }
}

export class UserSuspendedException extends ForbiddenException {
  constructor() {
    super({
      error: 'USER_SUSPENDED',
      message: 'This account is suspended.',
    });
  }
}

export class InsufficientRoleException extends ForbiddenException {
  constructor() {
    super({
      error: 'INSUFFICIENT_ROLE',
      message: 'Your role does not allow this action.',
    });
  }
}
