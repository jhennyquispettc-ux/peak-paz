import { canStillAnswer, rescheduleRespondBy } from './reschedule-rules.js';

describe('reschedule rules', () => {
  const original = new Date('2026-12-10T11:00:00Z');

  it('gives the tourist until 24 hours before the original date when the new one is later', () => {
    const later = new Date('2026-12-15T11:00:00Z');
    expect(rescheduleRespondBy(original, later, 24)).toEqual(
      new Date('2026-12-09T11:00:00Z'),
    );
  });

  it('uses the new date when it comes before the original one', () => {
    const earlier = new Date('2026-12-07T11:00:00Z');
    expect(rescheduleRespondBy(original, earlier, 24)).toEqual(
      new Date('2026-12-06T11:00:00Z'),
    );
  });

  it('accepts answers only before the deadline', () => {
    const respondBy = new Date('2026-12-09T11:00:00Z');
    expect(canStillAnswer(new Date('2026-12-09T10:59:00Z'), respondBy)).toBe(
      true,
    );
    expect(canStillAnswer(respondBy, respondBy)).toBe(false);
  });
});
