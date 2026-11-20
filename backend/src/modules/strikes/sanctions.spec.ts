import {
  addMonths,
  allocateFines,
  fineFor,
  hiddenUntil,
  SanctionLevel,
  sanctionLevel,
} from './sanctions.js';

describe('sanction helpers', () => {
  it('hides the guide at two strikes and suspends at three', () => {
    expect(sanctionLevel(0, 2, 3)).toBe(SanctionLevel.NONE);
    expect(sanctionLevel(1, 2, 3)).toBe(SanctionLevel.NONE);
    expect(sanctionLevel(2, 2, 3)).toBe(SanctionLevel.HIDDEN);
    expect(sanctionLevel(3, 2, 3)).toBe(SanctionLevel.SUSPENDED);
    expect(sanctionLevel(4, 2, 3)).toBe(SanctionLevel.SUSPENDED);
  });

  it('calculates the fine as a percentage of the booking', () => {
    expect(fineFor(150, 20)).toBe(30);
    expect(fineFor(155, 15)).toBe(23.25);
    expect(fineFor(99.99, 10)).toBe(10);
  });

  it('keeps the latest date when the guide is already hidden', () => {
    const now = new Date('2026-12-01T12:00:00Z');
    expect(hiddenUntil(null, now, 30)).toEqual(
      new Date('2026-12-31T12:00:00Z'),
    );
    const later = new Date('2027-02-01T00:00:00Z');
    expect(hiddenUntil(later, now, 30)).toEqual(later);
  });

  it('adds calendar months for the strike validity', () => {
    expect(addMonths(new Date('2026-11-20T10:00:00Z'), 12)).toEqual(
      new Date('2027-11-20T10:00:00Z'),
    );
  });

  it('settles the oldest fines first without going over the payout', () => {
    const fines = [
      { id: 'a', pending: 30 },
      { id: 'b', pending: 50 },
      { id: 'c', pending: 10 },
    ];
    expect(allocateFines(127.5, fines)).toEqual([
      { id: 'a', amount: 30 },
      { id: 'b', amount: 50 },
      { id: 'c', amount: 10 },
    ]);
    expect(allocateFines(60, fines)).toEqual([
      { id: 'a', amount: 30 },
      { id: 'b', amount: 30 },
    ]);
    expect(allocateFines(0, fines)).toEqual([]);
  });
});
