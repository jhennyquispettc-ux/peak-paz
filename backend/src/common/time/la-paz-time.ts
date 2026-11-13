const LA_PAZ_OFFSET = '-04:00';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function laPazInstant(date: string, time: string): Date {
  return new Date(`${date}T${time.slice(0, 5)}:00${LA_PAZ_OFFSET}`);
}

export function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  return new Date(base.getTime() + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000);
}
