import { NotFoundException } from '@nestjs/common';

export class AgencyNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'AGENCY_NOT_FOUND', message: 'Agency not found.' });
  }
}
