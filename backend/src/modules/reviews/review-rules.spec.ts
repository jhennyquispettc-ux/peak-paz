import { canReview, roundRating } from './review-rules.js';

describe('review rules', () => {
  const endsAt = new Date('2026-12-10T19:00:00Z');

  it('accepts a review from the end of the tour until the window closes', () => {
    expect(canReview(new Date('2026-12-10T18:59:00Z'), endsAt, 30)).toBe(false);
    expect(canReview(endsAt, endsAt, 30)).toBe(true);
    expect(canReview(new Date('2027-01-09T19:00:00Z'), endsAt, 30)).toBe(true);
    expect(canReview(new Date('2027-01-09T19:01:00Z'), endsAt, 30)).toBe(false);
  });

  it('rounds the average to one decimal', () => {
    expect(roundRating(4.25)).toBe(4.3);
    expect(roundRating(4.24)).toBe(4.2);
    expect(roundRating(5)).toBe(5);
  });
});
