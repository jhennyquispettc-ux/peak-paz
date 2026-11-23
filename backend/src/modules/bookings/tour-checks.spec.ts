import {
  canMarkStart,
  canReconfirm,
  canReportNoShow,
  CompletionOutcome,
  completionOutcome,
  distanceMeters,
  reconfirmationMissed,
} from './tour-checks.js';

const START = new Date('2026-12-10T11:00:00Z');
const END = new Date('2026-12-10T19:00:00Z');
const at = (iso: string) => new Date(iso);

describe('tour checks', () => {
  it('measures the distance between two points in meters', () => {
    expect(distanceMeters(-16.35, -67.92, -16.35, -67.92)).toBe(0);
    const oneKm = distanceMeters(-16.35, -67.92, -16.359, -67.92);
    expect(oneKm).toBeGreaterThan(990);
    expect(oneKm).toBeLessThan(1010);
  });

  it('lets the guide reconfirm from 72 hours before until the start', () => {
    expect(canReconfirm(at('2026-12-07T10:59:00Z'), START, 72)).toBe(false);
    expect(canReconfirm(at('2026-12-07T11:00:00Z'), START, 72)).toBe(true);
    expect(canReconfirm(at('2026-12-10T10:59:00Z'), START, 72)).toBe(true);
    expect(canReconfirm(START, START, 72)).toBe(false);
  });

  it('marks the reconfirmation as missed 24 hours before the start', () => {
    expect(
      reconfirmationMissed(at('2026-12-09T10:59:00Z'), START, 24, null),
    ).toBe(false);
    expect(
      reconfirmationMissed(at('2026-12-09T11:00:00Z'), START, 24, null),
    ).toBe(true);
    expect(
      reconfirmationMissed(
        at('2026-12-09T12:00:00Z'),
        START,
        24,
        at('2026-12-08T09:00:00Z'),
      ),
    ).toBe(false);
  });

  it('accepts the start from an hour before until the grace period ends', () => {
    expect(canMarkStart(at('2026-12-10T09:59:00Z'), START, END, 60, 0)).toBe(
      false,
    );
    expect(canMarkStart(at('2026-12-10T10:00:00Z'), START, END, 60, 0)).toBe(
      true,
    );
    expect(canMarkStart(at('2026-12-10T19:01:00Z'), START, END, 60, 0)).toBe(
      false,
    );
    expect(canMarkStart(at('2026-12-11T18:59:00Z'), START, END, 60, 24)).toBe(
      true,
    );
  });

  it('allows the no show report only after the tolerance and if the guide did not start', () => {
    expect(canReportNoShow(at('2026-12-10T11:29:00Z'), START, 30, null)).toBe(
      false,
    );
    expect(canReportNoShow(at('2026-12-10T11:30:00Z'), START, 30, null)).toBe(
      true,
    );
    expect(canReportNoShow(at('2026-12-10T12:00:00Z'), START, 30, START)).toBe(
      false,
    );
  });

  it('opens a dispute only when nobody confirmed the tour', () => {
    expect(completionOutcome(START, START)).toBe(CompletionOutcome.COMPLETE);
    expect(completionOutcome(START, null)).toBe(CompletionOutcome.COMPLETE);
    expect(completionOutcome(null, START)).toBe(CompletionOutcome.COMPLETE);
    expect(completionOutcome(null, null)).toBe(CompletionOutcome.DISPUTE);
  });
});
