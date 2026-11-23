import type { StatusTone } from '../ui/StatusBadge';

export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED_BY_TOURIST'
  | 'CANCELLED_BY_PROVIDER'
  | 'CANCELLED_WEATHER';

export const BOOKING_STATUS: Record<
  BookingStatus,
  { label: string; tone: StatusTone }
> = {
  REQUESTED: { label: 'Solicitada', tone: 'warning' },
  ACCEPTED: { label: 'Por pagar', tone: 'warning' },
  CONFIRMED: { label: 'Confirmada', tone: 'success' },
  IN_PROGRESS: { label: 'En curso', tone: 'info' },
  COMPLETED: { label: 'Completada', tone: 'success' },
  REJECTED: { label: 'Rechazada', tone: 'muted' },
  EXPIRED: { label: 'Vencida', tone: 'muted' },
  CANCELLED_BY_TOURIST: { label: 'Cancelada por turista', tone: 'muted' },
  CANCELLED_BY_PROVIDER: { label: 'Cancelada por proveedor', tone: 'danger' },
  CANCELLED_WEATHER: { label: 'Cancelada por clima', tone: 'muted' },
};
