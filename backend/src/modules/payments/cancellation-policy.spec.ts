import { describe, expect, it } from 'vitest';
import { retainedAmount, touristRefundPercent } from './cancellation-policy.js';
import { splitPayout } from './money.js';

const DAY = 24 * 60 * 60 * 1000;

describe('tourist cancellation policy', () => {
  const startsAt = new Date('2026-12-20T11:00:00Z');
  const percentAt = (msBefore: number, guideMissedReconfirmation = false) =>
    touristRefundPercent({
      startsAt,
      now: new Date(startsAt.getTime() - msBefore),
      fullDays: 7,
      partialDays: 3,
      partialPercent: 50,
      guideMissedReconfirmation,
    });

  it('refunds everything from seven days before', () => {
    expect(percentAt(7 * DAY)).toBe(100);
    expect(percentAt(20 * DAY)).toBe(100);
  });

  it('refunds half between three and seven days before', () => {
    expect(percentAt(7 * DAY - 1)).toBe(50);
    expect(percentAt(5 * DAY)).toBe(50);
    expect(percentAt(3 * DAY)).toBe(50);
  });

  it('refunds nothing with less than three days', () => {
    expect(percentAt(3 * DAY - 1)).toBe(0);
    expect(percentAt(DAY)).toBe(0);
  });

  it('refunds everything when the guide missed the reconfirmation', () => {
    expect(percentAt(DAY, true)).toBe(100);
  });

  it('charges the commission only on the retained amount', () => {
    const retained = retainedAmount(300, 50);
    expect(retained).toBe(150);
    expect(splitPayout(retained, 15)).toEqual({
      commissionAmount: 22.5,
      netAmount: 127.5,
    });
  });
});
