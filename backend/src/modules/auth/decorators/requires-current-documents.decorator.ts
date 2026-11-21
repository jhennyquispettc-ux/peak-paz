import { SetMetadata } from '@nestjs/common';

export const REQUIRES_CURRENT_DOCUMENTS = 'requiresCurrentDocuments';
export const RequiresCurrentDocuments = () =>
  SetMetadata(REQUIRES_CURRENT_DOCUMENTS, true);
