const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function canReview(
  now: Date,
  endsAt: Date,
  windowDays: number,
): boolean {
  return (
    now >= endsAt && now.getTime() <= endsAt.getTime() + windowDays * MS_PER_DAY
  );
}

export function roundRating(average: number): number {
  return Math.round(average * 10) / 10;
}
