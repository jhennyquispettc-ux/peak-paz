import type { DepartureStatus } from '../../api/agency';
import type { StatusTone } from '../../ui/StatusBadge';

export const DEPARTURE_STATUS: Record<
  DepartureStatus,
  { label: string; tone: StatusTone }
> = {
  PUBLISHED: { label: 'Inscripciones abiertas', tone: 'info' },
  CONFIRMED: { label: 'Confirmada', tone: 'success' },
  IN_PROGRESS: { label: 'En curso', tone: 'info' },
  COMPLETED: { label: 'Completada', tone: 'success' },
  CANCELLED_MIN_NOT_REACHED: { label: 'Sin mínimo de personas', tone: 'muted' },
  CANCELLED_BY_AGENCY: { label: 'Cancelada por la agencia', tone: 'danger' },
  CANCELLED_WEATHER: { label: 'Cancelada por clima', tone: 'muted' },
};

export const ACTIVE_DEPARTURES: DepartureStatus[] = [
  'PUBLISHED',
  'CONFIRMED',
  'IN_PROGRESS',
];
