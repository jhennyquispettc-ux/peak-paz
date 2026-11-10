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

export enum ComplaintStatus {
  OPEN = 'OPEN',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}
