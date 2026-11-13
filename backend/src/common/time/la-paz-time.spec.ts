import { addDays, addMinutes, laPazInstant, weekdayOf } from './la-paz-time.js';

describe('La Paz time helpers', () => {
  it('reads a local date and time as UTC-4', () => {
    expect(laPazInstant('2026-12-05', '07:30').toISOString()).toBe(
      '2026-12-05T11:30:00.000Z',
    );
    expect(laPazInstant('2026-12-05', '07:30:00').toISOString()).toBe(
      '2026-12-05T11:30:00.000Z',
    );
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('returns the weekday with sunday as 0', () => {
    expect(weekdayOf('2026-11-15')).toBe(0);
    expect(weekdayOf('2026-11-21')).toBe(6);
  });

  it('adds minutes to an instant', () => {
    const base = new Date('2026-11-12T10:00:00Z');
    expect(addMinutes(base, 120).toISOString()).toBe(
      '2026-11-12T12:00:00.000Z',
    );
  });
});
