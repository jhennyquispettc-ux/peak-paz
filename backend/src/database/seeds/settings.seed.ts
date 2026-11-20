import { DataSource } from 'typeorm';
import { Setting } from '../../modules/settings/entities/setting.entity.js';

const DEFAULT_SETTINGS: Pick<Setting, 'key' | 'value' | 'description'>[] = [
  {
    key: 'COMMISSION_RATE',
    value: '15',
    description: 'Comisión de la plataforma en porcentaje',
  },
  {
    key: 'RESPONSE_WINDOW_MIN',
    value: '120',
    description: 'Minutos que tiene el proveedor para aceptar una solicitud',
  },
  {
    key: 'PAYMENT_WINDOW_MIN',
    value: '30',
    description: 'Minutos que tiene el turista para pagar desde la aceptación',
  },
  {
    key: 'MIN_ADVANCE_HOURS',
    value: '14',
    description: 'Anticipación mínima de una solicitud en horas',
  },
  {
    key: 'GROUP_CLOSE_HOURS',
    value: '48',
    description: 'Horas antes del inicio en que se cierra una salida grupal',
  },
  {
    key: 'REFUND_MIN_DAYS',
    value: '7',
    description: 'Días mínimos de anticipación para tener reembolso',
  },
  {
    key: 'GROUP_MIN_PEOPLE',
    value: '3',
    description: 'Mínimo de personas para que una salida grupal se realice',
  },
  {
    key: 'PRIVATE_MAX_PEOPLE',
    value: '5',
    description: 'Máximo de personas en un tour privado',
  },
  {
    key: 'STRIKE_VALIDITY_MONTHS',
    value: '12',
    description: 'Meses de vigencia de un strike',
  },
  {
    key: 'STRIKE_HIDDEN_DAYS',
    value: '30',
    description: 'Días que un proveedor queda oculto con 2 strikes',
  },
  {
    key: 'MAX_FINE_PERCENT',
    value: '20',
    description:
      'Multa máxima por cancelación del guía, en porcentaje de la reserva',
  },
  {
    key: 'STRIKES_TO_HIDE',
    value: '2',
    description: 'Strikes activos con los que el guía queda oculto',
  },
  {
    key: 'STRIKES_TO_SUSPEND',
    value: '3',
    description:
      'Strikes activos con los que el guía queda suspendido de forma permanente',
  },
  {
    key: 'RECONFIRM_OPEN_HOURS',
    value: '72',
    description:
      'Horas antes del inicio desde las que el guía puede reconfirmar',
  },
  {
    key: 'RECONFIRM_DEADLINE_HOURS',
    value: '24',
    description:
      'Horas antes del inicio en que vence la reconfirmación del guía',
  },
  {
    key: 'START_EARLY_MIN',
    value: '60',
    description:
      'Minutos antes del inicio desde los que se puede marcar el tour como iniciado',
  },
  {
    key: 'NO_SHOW_TOLERANCE_MIN',
    value: '30',
    description: 'Minutos de espera antes de reportar que el guía no llegó',
  },
  {
    key: 'START_CONFIRM_GRACE_HOURS',
    value: '24',
    description:
      'Horas después del fin del tour que tiene el turista para confirmar el inicio',
  },
  {
    key: 'SCHEDULE_BUFFER_MIN',
    value: '120',
    description:
      'Minutos libres que el guía necesita antes y después de cada compromiso',
  },
  {
    key: 'BOB_PER_USD',
    value: '6.96',
    description: 'Bolivianos por dólar para cobrar en USD por PayPal',
  },
];

export async function seedSettings(dataSource: DataSource): Promise<number> {
  await dataSource
    .getRepository(Setting)
    .createQueryBuilder()
    .insert()
    .values(DEFAULT_SETTINGS)
    .orIgnore()
    .execute();
  return DEFAULT_SETTINGS.length;
}
