import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

export class DocumentFileRequiredException extends BadRequestException {
  constructor() {
    super({
      error: 'DOCUMENT_FILE_REQUIRED',
      message: 'Send the document in the "file" field.',
    });
  }
}

export class InvalidDocumentFileException extends BadRequestException {
  constructor() {
    super({
      error: 'INVALID_DOCUMENT_FILE',
      message: 'Only PDF, JPG or PNG files are accepted.',
    });
  }
}

export class DocumentExpiredException extends BadRequestException {
  constructor() {
    super({
      error: 'DOCUMENT_EXPIRED',
      message: 'The expiry date of the document has already passed.',
    });
  }
}

export class DocumentNotFoundException extends NotFoundException {
  constructor() {
    super({ error: 'DOCUMENT_NOT_FOUND', message: 'Document not found.' });
  }
}

export class DocumentsIncompleteException extends BadRequestException {
  constructor(missing: string[]) {
    super({
      error: 'DOCUMENTS_INCOMPLETE',
      message: `Missing or expired documents: ${missing.join(', ')}.`,
    });
  }
}

export class ProfileLockedException extends BadRequestException {
  constructor() {
    super({
      error: 'PROFILE_LOCKED',
      message:
        'Identity and legal data cannot be changed once the account is approved.',
    });
  }
}

export class ReviewNotAvailableException extends BadRequestException {
  constructor() {
    super({
      error: 'REVIEW_NOT_AVAILABLE',
      message: 'A new review can only be requested after a rejection.',
    });
  }
}

export class ProviderNotApprovedException extends ForbiddenException {
  constructor() {
    super({
      error: 'PROVIDER_NOT_APPROVED',
      message: 'The account must be approved by an admin first.',
    });
  }
}
