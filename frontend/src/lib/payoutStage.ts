import type { PayoutStage } from '../api/adminManage';
import type { StatusTone } from '../ui/StatusBadge';

export const PAYOUT_STAGES: Record<
  PayoutStage,
  { label: string; tone: StatusTone }
> = {
  WAITING: { label: 'En espera', tone: 'info' },
  READY: { label: 'Lista para pagar', tone: 'success' },
  ON_HOLD: { label: 'Retenida por reclamo', tone: 'warning' },
  PAID: { label: 'Pagada', tone: 'muted' },
};
