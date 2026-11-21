import { useState } from 'react';
import {
  listSettings,
  updateSetting,
  type Setting,
} from '../../api/adminManage';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../hooks/useResource';
import ErrorState from '../../ui/ErrorState';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import { useToast } from '../../ui/Toast';

const GROUPS: { title: string; keys: string[] }[] = [
  {
    title: 'Dinero',
    keys: ['COMMISSION_RATE', 'BOB_PER_USD', 'MAX_FINE_PERCENT'],
  },
  {
    title: 'Reservas',
    keys: [
      'MIN_ADVANCE_HOURS',
      'RESPONSE_WINDOW_MIN',
      'PAYMENT_WINDOW_MIN',
      'PRIVATE_MAX_PEOPLE',
      'SCHEDULE_BUFFER_MIN',
      'REFUND_MIN_DAYS',
      'RESCHEDULE_DEADLINE_HOURS',
    ],
  },
  {
    title: 'Salidas grupales',
    keys: ['GROUP_MIN_PEOPLE', 'GROUP_CLOSE_HOURS'],
  },
  {
    title: 'Día del tour',
    keys: [
      'RECONFIRM_OPEN_HOURS',
      'RECONFIRM_DEADLINE_HOURS',
      'START_EARLY_MIN',
      'NO_SHOW_TOLERANCE_MIN',
      'START_CONFIRM_GRACE_HOURS',
    ],
  },
  {
    title: 'Después del tour',
    keys: ['COMPLAINT_WINDOW_HOURS', 'REVIEW_WINDOW_DAYS'],
  },
  {
    title: 'Sanciones',
    keys: [
      'STRIKES_TO_HIDE',
      'STRIKES_TO_SUSPEND',
      'STRIKE_HIDDEN_DAYS',
      'STRIKE_VALIDITY_MONTHS',
    ],
  },
];

function SettingRow({
  setting,
  onSaved,
}: {
  setting: Setting;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [value, setValue] = useState(setting.value);
  const { busy, error, run } = useAction();
  const number = Number(value);
  const changed = value !== setting.value;
  const valid = value.trim() !== '' && Number.isFinite(number) && number >= 0;
  const inputId = `setting-${setting.key}`;
  return (
    <div className="setting-row">
      <label htmlFor={inputId}>{setting.description}</label>
      <div className="setting-control">
        <input
          id={inputId}
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={!changed || !valid || busy}
          onClick={() =>
            void run(async () => {
              await updateSetting(setting.key, number);
              await onSaved();
              toast('Regla actualizada.');
            })
          }
        >
          Guardar
        </button>
      </div>
      {error && <ErrorState message={error} />}
    </div>
  );
}

export default function AdminSettingsPage() {
  const settings = useResource(listSettings, []);
  const byKey = new Map(settings.data?.map((item) => [item.key, item]));
  const grouped = new Set(GROUPS.flatMap((group) => group.keys));
  const others = settings.data?.filter((item) => !grouped.has(item.key)) ?? [];
  const groups = [
    ...GROUPS.map((group) => ({
      title: group.title,
      items: group.keys.flatMap((key) => byKey.get(key) ?? []),
    })),
    ...(others.length > 0 ? [{ title: 'Otras', items: others }] : []),
  ];
  return (
    <div className="page-stack">
      <PageHeader
        title="Reglas"
        intro="Ajusta plazos, comisiones y límites. Cada cambio se aplica a las operaciones nuevas en menos de un minuto."
      />
      {settings.error && (
        <ErrorState
          message={settings.error}
          onRetry={() => void settings.reload()}
        />
      )}
      {!settings.data && !settings.error && <LoadingState />}
      {settings.data &&
        groups.map((group) => (
          <section key={group.title} className="card settings-group">
            <h2 className="h3">{group.title}</h2>
            {group.items.map((setting) => (
              <SettingRow
                key={`${setting.key}-${setting.value}`}
                setting={setting}
                onSaved={settings.reload}
              />
            ))}
          </section>
        ))}
    </div>
  );
}
