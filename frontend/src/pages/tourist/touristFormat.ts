import type { BookingStatus } from '../../lib/bookingStatus';
import type { StatusTone } from '../../ui/StatusBadge';

export const STATUS_LABELS: Record<
  BookingStatus,
  { es: string; en: string; tone: StatusTone }
> = {
  REQUESTED: {
    es: 'Esperando al guía',
    en: 'Waiting for guide',
    tone: 'warning',
  },
  ACCEPTED: { es: 'Por pagar', en: 'Payment due', tone: 'warning' },
  CONFIRMED: { es: 'Confirmada', en: 'Confirmed', tone: 'success' },
  IN_PROGRESS: { es: 'En curso', en: 'In progress', tone: 'info' },
  COMPLETED: { es: 'Completada', en: 'Completed', tone: 'success' },
  REJECTED: { es: 'No aceptada', en: 'Not accepted', tone: 'muted' },
  EXPIRED: { es: 'Vencida', en: 'Expired', tone: 'muted' },
  CANCELLED_BY_TOURIST: { es: 'Cancelada', en: 'Cancelled', tone: 'muted' },
  CANCELLED_BY_PROVIDER: {
    es: 'Cancelada por el proveedor',
    en: 'Cancelled by provider',
    tone: 'danger',
  },
  CANCELLED_WEATHER: {
    es: 'Cancelada por clima',
    en: 'Cancelled due to weather',
    tone: 'muted',
  },
};

export function bolivianos(amount: number, locale: string) {
  return `Bs ${Number(amount).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function dayLabel(date: string, time: string | null, locale: string) {
  const [year, month, day] = date.split('-').map(Number);
  const label = new Date(year, month - 1, day).toLocaleDateString(locale, {
    dateStyle: 'medium',
  });
  return time ? `${label}, ${time.slice(0, 5)}` : label;
}

export function momentLabel(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
