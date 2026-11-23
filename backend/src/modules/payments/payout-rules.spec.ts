import { describe, expect, it } from 'vitest';
import { payableFrom, payoutStage, PayoutStage } from './payout-rules.js';

describe('payout rules', () => {
  const endsAt = new Date('2026-12-05T20:00:00.000Z');
  const payableAt = payableFrom(endsAt, 72);

  it('opens the payment when the complaint window ends', () => {
    expect(payableAt.toISOString()).toBe('2026-12-08T20:00:00.000Z');
  });

  it('waits during the complaint window', () => {
    expect(
      payoutStage({
        paid: false,
        hasOpenComplaint: false,
        payableAt,
        now: new Date(payableAt.getTime() - 1),
      }),
    ).toBe(PayoutStage.WAITING);
  });

  it('is ready at the exact end of the window', () => {
    expect(
      payoutStage({
        paid: false,
        hasOpenComplaint: false,
        payableAt,
        now: payableAt,
      }),
    ).toBe(PayoutStage.READY);
  });

  it('holds the payout while a complaint is open', () => {
    expect(
      payoutStage({
        paid: false,
        hasOpenComplaint: true,
        payableAt,
        now: new Date(payableAt.getTime() + 1),
      }),
    ).toBe(PayoutStage.ON_HOLD);
  });

  it('keeps a paid payout as paid', () => {
    expect(
      payoutStage({
        paid: true,
        hasOpenComplaint: true,
        payableAt,
        now: endsAt,
      }),
    ).toBe(PayoutStage.PAID);
  });
});
