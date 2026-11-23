export enum GuideDocumentType {
  NATIONAL_ID = 'NATIONAL_ID',
  GUIDE_CREDENTIAL = 'GUIDE_CREDENTIAL',
  FIRST_AID = 'FIRST_AID',
}

export const GUIDE_CREDENTIAL_TYPES = ['SIRETUR', 'FEBOGUIT'] as const;
export type GuideCredentialType = (typeof GUIDE_CREDENTIAL_TYPES)[number];

export const REQUIRED_GUIDE_DOCUMENTS = [
  GuideDocumentType.NATIONAL_ID,
  GuideDocumentType.GUIDE_CREDENTIAL,
  GuideDocumentType.FIRST_AID,
] as const;

export enum AvailabilityMode {
  WEEKLY = 'WEEKLY',
  BY_DATE = 'BY_DATE',
}
