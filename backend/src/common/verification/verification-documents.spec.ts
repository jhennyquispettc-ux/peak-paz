import {
  DocumentExpiredException,
  DocumentFileRequiredException,
  InvalidDocumentFileException,
} from '../exceptions/verification.exceptions.js';
import type { UploadedFileData } from '../types/uploaded-file.js';
import {
  missingDocumentTypes,
  prepareDocumentFile,
  todayInLaPaz,
} from './verification-documents.js';

function upload(content: string | Buffer): UploadedFileData {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return {
    originalname: 'document',
    mimetype: 'application/octet-stream',
    size: buffer.length,
    buffer,
  };
}

describe('verification documents', () => {
  it('uses the La Paz calendar day', () => {
    expect(todayInLaPaz(new Date('2026-11-11T02:00:00Z'))).toBe('2026-11-10');
    expect(todayInLaPaz(new Date('2026-11-11T05:00:00Z'))).toBe('2026-11-11');
  });

  it('prepares a valid PDF with its detected type', () => {
    const file = prepareDocumentFile(
      upload('%PDF-1.4 body'),
      '2027-01-01',
      '2026-11-10',
    );
    expect(file.extension).toBe('pdf');
    expect(file.mimetype).toBe('application/pdf');
  });

  it('rejects a missing file, an unknown format and an expired date', () => {
    expect(() => prepareDocumentFile(undefined, undefined)).toThrow(
      DocumentFileRequiredException,
    );
    expect(() => prepareDocumentFile(upload('hello'), undefined)).toThrow(
      InvalidDocumentFileException,
    );
    expect(() =>
      prepareDocumentFile(upload('%PDF-1.4'), '2026-11-09', '2026-11-10'),
    ).toThrow(DocumentExpiredException);
  });

  it('lists required documents that are missing or expired', () => {
    const missing = missingDocumentTypes(
      ['A', 'B', 'C'] as const,
      [
        { type: 'A', expiresAt: null },
        { type: 'B', expiresAt: '2026-11-09' },
        { type: 'C', expiresAt: '2026-11-10' },
      ],
      '2026-11-10',
    );
    expect(missing).toEqual(['B']);
  });
});
