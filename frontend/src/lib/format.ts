const LOCALE = 'es-BO';

export function money(amount: number | string) {
  return `Bs ${Number(amount).toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function dateTime(value: string | null) {
  if (!value) return 'Sin registro';
  return new Date(value).toLocaleString(LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function dateOnly(value: string) {
  return new Date(value).toLocaleDateString(LOCALE, { dateStyle: 'medium' });
}

export function tourDay(date: string | null, time?: string | null) {
  if (!date) return 'Sin fecha';
  const [year, month, day] = date.split('-').map(Number);
  const label = new Date(year, month - 1, day).toLocaleDateString(LOCALE, {
    dateStyle: 'medium',
  });
  return time ? `${label}, ${time.slice(0, 5)}` : label;
}

export function noticeTime(hours: number | null) {
  if (hours === null) return 'Sin dato';
  if (hours < 0) return 'Después del inicio';
  if (hours < 48) return `${hours} h antes`;
  return `${Math.floor(hours / 24)} días antes`;
}
