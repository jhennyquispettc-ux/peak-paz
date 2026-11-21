export enum BookingType {
  PRIVATE = 'PRIVATE',
  GROUP = 'GROUP',
}

export enum BookingSource {
  WEB = 'WEB',
  MANUAL = 'MANUAL',
}

export enum BookingStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED_BY_TOURIST = 'CANCELLED_BY_TOURIST',
  CANCELLED_BY_PROVIDER = 'CANCELLED_BY_PROVIDER',
  CANCELLED_WEATHER = 'CANCELLED_WEATHER',
}

export enum RescheduleResponse {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum DisputeReason {
  GUIDE_NO_SHOW = 'GUIDE_NO_SHOW',
  START_MISMATCH = 'START_MISMATCH',
}

export enum DisputeParty {
  TOURIST = 'TOURIST',
  SYSTEM = 'SYSTEM',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
}

export enum TourHelpStatus {
  OPEN = 'OPEN',
  ATTENDED = 'ATTENDED',
}

export enum DisputeDecision {
  TOUR_HAPPENED = 'TOUR_HAPPENED',
  GUIDE_NO_SHOW = 'GUIDE_NO_SHOW',
}
