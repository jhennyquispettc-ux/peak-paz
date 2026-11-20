const MS_PER_HOUR = 60 * 60 * 1000;

export function rescheduleRespondBy(
  originalStart: Date,
  newStart: Date,
  deadlineHours: number,
): Date {
  const earliest = originalStart < newStart ? originalStart : newStart;
  return new Date(earliest.getTime() - deadlineHours * MS_PER_HOUR);
}

export function canStillAnswer(now: Date, respondBy: Date): boolean {
  return now < respondBy;
}
