import { isRefundable, round2 } from './money.js';

export interface RefundPolicyInput {
  startsAt: Date;
  now: Date;
  fullDays: number;
  partialDays: number;
  partialPercent: number;
  guideMissedReconfirmation: boolean;
}

export function touristRefundPercent(input: RefundPolicyInput): number {
  if (input.guideMissedReconfirmation) return 100;
  if (isRefundable(input.startsAt, input.now, input.fullDays)) return 100;
  if (isRefundable(input.startsAt, input.now, input.partialDays)) {
    return input.partialPercent;
  }
  return 0;
}

export function retainedAmount(total: number, refundPercent: number): number {
  return round2(total - round2((total * refundPercent) / 100));
}
