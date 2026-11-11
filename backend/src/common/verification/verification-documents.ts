import { detectDocumentType } from '../../storage/file-signature.js';
import type { FileToStore } from '../../storage/storage.service.js';
import {
  DocumentExpiredException,
  DocumentFileRequiredException,
  InvalidDocumentFileException,
} from '../exceptions/verification.exceptions.js';
import type { UploadedFileData } from '../types/uploaded-file.js';

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

interface DocumentLike<T extends string> {
  type: T;
  expiresAt: string | null;
}

export function todayInLaPaz(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function prepareDocumentFile(
  file: UploadedFileData | undefined,
  expiresAt: string | undefined,
  today = todayInLaPaz(),
): FileToStore {
  if (!file?.buffer?.length) throw new DocumentFileRequiredException();
  const detected = detectDocumentType(file.buffer);
  if (!detected) throw new InvalidDocumentFileException();
  if (expiresAt && expiresAt < today) throw new DocumentExpiredException();
  return { buffer: file.buffer, ...detected };
}

export function missingDocumentTypes<T extends string>(
  required: readonly T[],
  documents: DocumentLike<T>[],
  today = todayInLaPaz(),
): T[] {
  return required.filter(
    (type) =>
      !documents.some(
        (document) =>
          document.type === type &&
          (document.expiresAt === null || document.expiresAt >= today),
      ),
  );
}

export function documentUploadSchema(types: string[]) {
  return {
    type: 'object' as const,
    required: ['type', 'file'],
    properties: {
      type: { type: 'string' as const, enum: types },
      expiresAt: { type: 'string' as const, format: 'date' },
      file: {
        type: 'string' as const,
        format: 'binary',
        description: 'PDF, JPG o PNG de hasta 5 MB',
      },
    },
  };
}
