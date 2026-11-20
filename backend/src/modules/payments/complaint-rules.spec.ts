import { canComplain, deductionFor } from './complaint-rules.js';

describe('complaint rules', () => {
  const endsAt = new Date('2026-12-10T19:00:00Z');

  it('accepts a complaint from the end of the tour for 72 hours', () => {
    expect(canComplain(new Date('2026-12-10T18:00:00Z'), endsAt, 72)).toBe(
      false,
    );
    expect(canComplain(endsAt, endsAt, 72)).toBe(true);
    expect(canComplain(new Date('2026-12-13T19:00:00Z'), endsAt, 72)).toBe(
      true,
    );
    expect(canComplain(new Date('2026-12-13T19:01:00Z'), endsAt, 72)).toBe(
      false,
    );
  });

  it('takes the refunded share of the booking from the provider', () => {
    expect(deductionFor(150, 50)).toBe(75);
    expect(deductionFor(155, 30)).toBe(46.5);
    expect(deductionFor(150, 0)).toBe(0);
  });
});
