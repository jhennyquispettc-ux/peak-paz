const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function round2(value: number): number {
  return Number(`${Math.round(Number(`${value}e2`))}e-2`);
}

export function toChargeAmount(amountBob: number, bobPerUsd: number): number {
  return round2(amountBob / bobPerUsd);
}

export function splitPayout(
  grossAmount: number,
  commissionPercent: number,
  penaltyDeduction = 0,
): { commissionAmount: number; netAmount: number } {
  const commissionAmount = round2((grossAmount * commissionPercent) / 100);
  return {
    commissionAmount,
    netAmount: round2(grossAmount - commissionAmount - penaltyDeduction),
  };
}

export function isRefundable(
  startsAt: Date,
  now: Date,
  minDays: number,
): boolean {
  return startsAt.getTime() - now.getTime() >= minDays * MS_PER_DAY;
}
