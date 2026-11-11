export enum GuideDocumentType {
  NATIONAL_ID = 'NATIONAL_ID',
  GUIDE_CREDENTIAL = 'GUIDE_CREDENTIAL',
  FIRST_AID = 'FIRST_AID',
}

export const REQUIRED_GUIDE_DOCUMENTS = [
  GuideDocumentType.NATIONAL_ID,
  GuideDocumentType.GUIDE_CREDENTIAL,
  GuideDocumentType.FIRST_AID,
] as const;
