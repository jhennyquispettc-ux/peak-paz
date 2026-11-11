import { ConflictException, NotFoundException } from '@nestjs/common';

export class GuideNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'GUIDE_NOT_FOUND', message: 'Guide profile not found.' });
  }
}

export class GuideRouteNotFoundException extends NotFoundException {
  constructor() {
    super({
      error: 'GUIDE_ROUTE_NOT_FOUND',
      message: 'Route request not found.',
    });
  }
}

export class GuideRouteAlreadyRequestedException extends ConflictException {
  constructor() {
    super({
      error: 'GUIDE_ROUTE_ALREADY_REQUESTED',
      message: 'This route was already requested or approved.',
    });
  }
}
