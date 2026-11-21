import { round2 } from './money.js';

const MS_PER_HOUR = 60 * 60 * 1000;

export function canComplain(
  now: Date,
  startsAt: Date,
  endsAt: Date,
  windowHours: number,
): boolean {
  return (
    now >= startsAt &&
    now.getTime() <= endsAt.getTime() + windowHours * MS_PER_HOUR
  );
}

export function deductionFor(
  totalAmount: number,
  refundPercent: number,
): number {
  return round2((totalAmount * refundPercent) / 100);
}
