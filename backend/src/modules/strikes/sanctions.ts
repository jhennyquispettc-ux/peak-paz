import { round2 } from '../payments/money.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export enum SanctionLevel {
  NONE = 'NONE',
  HIDDEN = 'HIDDEN',
  SUSPENDED = 'SUSPENDED',
}

export interface PendingFine {
  id: string;
  pending: number;
}

export interface FineSettlement {
  id: string;
  amount: number;
}

export function sanctionLevel(
  activeStrikes: number,
  strikesToHide: number,
  strikesToSuspend: number,
): SanctionLevel {
  if (activeStrikes >= strikesToSuspend) return SanctionLevel.SUSPENDED;
  if (activeStrikes >= strikesToHide) return SanctionLevel.HIDDEN;
  return SanctionLevel.NONE;
}

export function fineFor(totalAmount: number, percent: number): number {
  return round2((totalAmount * percent) / 100);
}

export function hiddenUntil(
  current: Date | null,
  now: Date,
  hiddenDays: number,
): Date {
  const until = new Date(now.getTime() + hiddenDays * MS_PER_DAY);
  return current && current > until ? current : until;
}

export function addMonths(instant: Date, months: number): Date {
  const result = new Date(instant.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function allocateFines(
  available: number,
  fines: PendingFine[],
): FineSettlement[] {
  const settlements: FineSettlement[] = [];
  let remaining = round2(Math.max(available, 0));
  for (const fine of fines) {
    if (remaining <= 0) break;
    const amount = round2(Math.min(fine.pending, remaining));
    if (amount <= 0) continue;
    settlements.push({ id: fine.id, amount });
    remaining = round2(remaining - amount);
  }
  return settlements;
}
