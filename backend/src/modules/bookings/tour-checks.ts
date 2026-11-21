const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const EARTH_RADIUS_M = 6_371_000;

export enum CompletionOutcome {
  COMPLETE = 'COMPLETE',
  DISPUTE = 'DISPUTE',
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export function distanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) *
      Math.cos(toRadians(toLatitude)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return Math.round(
    2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
  );
}

export function canReconfirm(
  now: Date,
  startsAt: Date,
  openHours: number,
): boolean {
  return (
    now.getTime() >= startsAt.getTime() - openHours * MS_PER_HOUR &&
    now < startsAt
  );
}

export function reconfirmationMissed(
  now: Date,
  startsAt: Date,
  deadlineHours: number,
  reconfirmedAt: Date | null,
): boolean {
  return (
    reconfirmedAt === null &&
    now.getTime() >= startsAt.getTime() - deadlineHours * MS_PER_HOUR
  );
}

export function canMarkStart(
  now: Date,
  startsAt: Date,
  endsAt: Date,
  earlyMinutes: number,
  graceHours: number,
): boolean {
  return (
    now.getTime() >= startsAt.getTime() - earlyMinutes * MS_PER_MINUTE &&
    now.getTime() <= endsAt.getTime() + graceHours * MS_PER_HOUR
  );
}

export function canReportNoShow(
  now: Date,
  startsAt: Date,
  toleranceMinutes: number,
  guideStartedAt: Date | null,
): boolean {
  return (
    guideStartedAt === null &&
    now.getTime() >= startsAt.getTime() + toleranceMinutes * MS_PER_MINUTE
  );
}

export function canAskForHelp(
  now: Date,
  startsAt: Date,
  endsAt: Date,
): boolean {
  return now >= startsAt && now <= endsAt;
}

export function completionOutcome(
  guideStartedAt: Date | null,
  touristStartedAt: Date | null,
): CompletionOutcome {
  return guideStartedAt || touristStartedAt
    ? CompletionOutcome.COMPLETE
    : CompletionOutcome.DISPUTE;
}
