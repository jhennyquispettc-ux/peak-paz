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
