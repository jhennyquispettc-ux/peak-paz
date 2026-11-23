import { api, readToken } from './client';
import type { User } from './types';

export const DOCUMENTS = [
  { type: 'NATIONAL_ID', label: 'Cédula de identidad' },
  { type: 'GUIDE_CREDENTIAL', label: 'Credencial de guía' },
  { type: 'FIRST_AID', label: 'Certificado de primeros auxilios' },
] as const;
export const REVIEW_LABELS: Record<string, string> = {
  PENDING: 'Pendiente de revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Requiere correcciones',
};
export interface GuideDocument {
  id: string;
  type: string;
  expiresAt: string | null;
  uploadedAt: string;
}
export interface GuideProfile {
  id: string;
  user: User;
  nationalId: string;
  verificationStatus: string;
  rejectionReason: string | null;
  documents: GuideDocument[];
  missingDocuments: string[];
}
export interface VerificationState {
  emailVerifiedAt: string | null;
  emailSentAt: string | null;
  emailFailedAt: string | null;
  nextResendAt: string;
  reviews: {
    id: string;
    status: string;
    reason: string | null;
    createdAt: string;
    decidedAt: string | null;
  }[];
}

export async function downloadDocument(path: string) {
  const response = await fetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${readToken()}` },
  });
  if (!response.ok)
    throw new Error('No se pudo descargar el documento. Vuelve a intentarlo.');
  const blob = await response.blob();
  const extension = blob.type.includes('pdf')
    ? 'pdf'
    : blob.type.includes('png')
      ? 'png'
      : 'jpg';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `documento.${extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function uploadGuideDocument(
  type: string,
  file: File,
  expiresAt: string,
) {
  const body = new FormData();
  body.set('type', type);
  body.set('file', file);
  if (expiresAt) body.set('expiresAt', expiresAt);
  return api('/guides/me/documents', { method: 'POST', body });
}
