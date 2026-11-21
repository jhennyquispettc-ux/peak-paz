export enum StrikeReason {
  CANCELLED_WITHOUT_WEATHER = 'CANCELLED_WITHOUT_WEATHER',
  NO_SHOW = 'NO_SHOW',
  COMPLAINT = 'COMPLAINT',
}

export enum StrikeStatus {
  ACTIVE = 'ACTIVE',
  REVERTED = 'REVERTED',
  EXPIRED = 'EXPIRED',
}

export enum CancellationReviewStatus {
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
}

export enum CancellationDecision {
  NO_SANCTION = 'NO_SANCTION',
  STRIKE = 'STRIKE',
  STRIKE_AND_FINE = 'STRIKE_AND_FINE',
}

export enum ComplaintReason {
  GENERAL = 'GENERAL',
  NO_SHOW = 'NO_SHOW',
}

export enum ComplaintStatus {
  OPEN = 'OPEN',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}
