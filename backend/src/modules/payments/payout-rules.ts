const MS_PER_HOUR = 60 * 60 * 1000;

export enum PayoutStage {
  WAITING = 'WAITING',
  READY = 'READY',
  ON_HOLD = 'ON_HOLD',
  PAID = 'PAID',
}

export function payableFrom(endsAt: Date, windowHours: number): Date {
  return new Date(endsAt.getTime() + windowHours * MS_PER_HOUR);
}

export function payoutStage(input: {
  paid: boolean;
  hasOpenComplaint: boolean;
  payableAt: Date;
  now: Date;
}): PayoutStage {
  if (input.paid) return PayoutStage.PAID;
  if (input.hasOpenComplaint) return PayoutStage.ON_HOLD;
  return input.now >= input.payableAt ? PayoutStage.READY : PayoutStage.WAITING;
}
