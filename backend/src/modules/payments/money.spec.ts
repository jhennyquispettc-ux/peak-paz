import { isRefundable, round2, splitPayout, toChargeAmount } from './money.js';

describe('money helpers', () => {
  it('rounds to cents without floating point surprises', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(21.551724)).toBe(21.55);
  });

  it('converts bolivianos to the charge currency', () => {
    expect(toChargeAmount(150, 6.96)).toBe(21.55);
    expect(toChargeAmount(500, 6.96)).toBe(71.84);
  });

  it('splits the payout into commission and net amount', () => {
    expect(splitPayout(150, 15)).toEqual({
      commissionAmount: 22.5,
      netAmount: 127.5,
    });
    expect(splitPayout(150, 15, 20)).toEqual({
      commissionAmount: 22.5,
      netAmount: 107.5,
    });
  });

  it('refunds only with seven full days of notice', () => {
    const start = new Date('2026-12-10T11:00:00Z');
    expect(isRefundable(start, new Date('2026-12-03T11:00:00Z'), 7)).toBe(true);
    expect(isRefundable(start, new Date('2026-12-03T11:00:01Z'), 7)).toBe(
      false,
    );
  });
});
