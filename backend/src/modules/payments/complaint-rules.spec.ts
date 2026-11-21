import { canComplain, deductionFor } from './complaint-rules.js';

describe('complaint rules', () => {
  const endsAt = new Date('2026-12-10T19:00:00Z');

  it('accepts a complaint from the start of the tour until 72 hours after the end', () => {
    const startsAt = new Date('2026-12-10T11:00:00Z');
    const allowed = (value: string) =>
      canComplain(new Date(value), startsAt, endsAt, 72);
    expect(allowed('2026-12-10T10:59:00Z')).toBe(false);
    expect(allowed('2026-12-10T11:00:00Z')).toBe(true);
    expect(allowed('2026-12-10T18:00:00Z')).toBe(true);
    expect(allowed('2026-12-13T19:00:00Z')).toBe(true);
    expect(allowed('2026-12-13T19:01:00Z')).toBe(false);
  });

  it('takes the refunded share of the booking from the provider', () => {
    expect(deductionFor(150, 50)).toBe(75);
    expect(deductionFor(155, 30)).toBe(46.5);
    expect(deductionFor(150, 0)).toBe(0);
  });
});
