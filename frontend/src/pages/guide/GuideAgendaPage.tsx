import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  addAvailableDate,
  addCommitment,
  getAgenda,
  getSchedule,
  removeAvailableDate,
  removeCommitment,
  setScheduleMode,
  setScheduleSlots,
  type AvailabilityMode,
  type GuideSchedule,
  type WeeklySlot,
} from '../../api/guide';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../hooks/useResource';
import { BOOKING_STATUS } from '../../lib/bookingStatus';
import { dateTime, tourDay } from '../../lib/format';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import { Field, SelectField } from '../../ui/Field';
import FilterChips from '../../ui/FilterChips';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';

const WEEKDAYS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const WEEKDAY_OPTIONS = WEEKDAYS.map((label, index) => ({
  value: String(index),
  label,
}));

function laPazDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
  }).format(date);
}

function WeeklyEditor({
  schedule,
  onSaved,
}: {
  schedule: GuideSchedule;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [slots, setSlots] = useState<WeeklySlot[]>(schedule.slots);
  const { busy, error, run } = useAction();
  const update = (index: number, patch: Partial<WeeklySlot>) =>
    setSlots((current) =>
      current.map((slot, position) =>
        position === index ? { ...slot, ...patch } : slot,
      ),
    );
  return (
    <section className="card form-stack">
      <h2 className="h3">Horario semanal</h2>
      <p className="small muted">
        Indica en qué rango puede empezar un tour cada día.
      </p>
      {slots.map((slot, index) => (
        <div className="slot-row" key={index}>
          <SelectField
            label="Día"
            value={String(slot.weekday)}
            options={WEEKDAY_OPTIONS}
            onChange={(value) => update(index, { weekday: Number(value) })}
          />
          <Field
            label="Desde"
            type="time"
            value={slot.timeFrom}
            onChange={(value) => update(index, { timeFrom: value })}
          />
          <Field
            label="Hasta"
            type="time"
            value={slot.timeTo}
            onChange={(value) => update(index, { timeTo: value })}
          />
          <button
            type="button"
            className="icon-btn"
            aria-label={`Quitar horario de ${WEEKDAYS[slot.weekday]}`}
            onClick={() =>
              setSlots((current) =>
                current.filter((_, position) => position !== index),
              )
            }
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      ))}
      {error && <ErrorState message={error} />}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={slots.length >= 28}
          onClick={() =>
            setSlots((current) => [
              ...current,
              { weekday: 6, timeFrom: '05:00', timeTo: '09:00' },
            ])
          }
        >
          <Plus aria-hidden="true" />
          Agregar horario
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await setScheduleSlots(slots);
              await onSaved();
              toast('Horario guardado.');
            })
          }
        >
          Guardar horario
        </button>
      </div>
    </section>
  );
}

function DatesEditor({
  schedule,
  onSaved,
}: {
  schedule: GuideSchedule;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [date, setDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('05:00');
  const [timeTo, setTimeTo] = useState('09:00');
  const { busy, error, run } = useAction();
  function submit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await addAvailableDate({ date, timeFrom, timeTo });
      setDate('');
      await onSaved();
      toast('Fecha agregada.');
    });
  }
  return (
    <section className="card form-stack">
      <h2 className="h3">Fechas disponibles</h2>
      <form className="slot-row" onSubmit={submit}>
        <Field
          label="Fecha"
          type="date"
          required
          value={date}
          onChange={setDate}
        />
        <Field
          label="Desde"
          type="time"
          required
          value={timeFrom}
          onChange={setTimeFrom}
        />
        <Field
          label="Hasta"
          type="time"
          required
          value={timeTo}
          onChange={setTimeTo}
        />
        <button type="submit" className="btn btn-secondary" disabled={busy}>
          Agregar
        </button>
      </form>
      {error && <ErrorState message={error} />}
      {schedule.availableDates.length === 0 ? (
        <p className="small muted">Todavía no agregaste fechas.</p>
      ) : (
        <ul className="plain-list">
          {schedule.availableDates.map((item) => (
            <li key={item.id}>
              <span>
                {tourDay(item.date)}, {item.timeFrom.slice(0, 5)} a{' '}
                {item.timeTo.slice(0, 5)}
              </span>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Quitar ${item.date}`}
                onClick={() =>
                  void run(async () => {
                    await removeAvailableDate(item.id);
                    await onSaved();
                  })
                }
              >
                <Trash2 aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommitmentsEditor({
  schedule,
  onSaved,
}: {
  schedule: GuideSchedule;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    dateFrom: '',
    timeFrom: '',
    dateTo: '',
    timeTo: '',
  });
  const { busy, error, run } = useAction();
  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (value: string) =>
      setForm((current) => ({ ...current, [key]: value })),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await addCommitment({
        title: form.title.trim(),
        dateFrom: form.dateFrom,
        dateTo: form.dateTo || form.dateFrom,
        ...(form.timeFrom ? { timeFrom: form.timeFrom } : {}),
        ...(form.timeTo ? { timeTo: form.timeTo } : {}),
      });
      setForm({
        title: '',
        dateFrom: '',
        timeFrom: '',
        dateTo: '',
        timeTo: '',
      });
      await onSaved();
      toast('Compromiso registrado.');
    });
  }
  return (
    <section className="card form-stack">
      <h2 className="h3">Compromisos fuera de la plataforma</h2>
      <p className="small muted">
        Bloquea fechas por vacaciones, transfers u otros tours.
      </p>
      <form className="form-stack-flat" onSubmit={submit}>
        <Field label="Título" required maxLength={120} {...bind('title')} />
        <div className="form-grid">
          <Field label="Desde" type="date" required {...bind('dateFrom')} />
          <Field
            label="Hora de inicio, opcional"
            type="time"
            {...bind('timeFrom')}
          />
          <Field label="Hasta" type="date" {...bind('dateTo')} />
          <Field
            label="Hora de fin, opcional"
            type="time"
            {...bind('timeTo')}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-secondary" disabled={busy}>
            Registrar compromiso
          </button>
        </div>
      </form>
      {error && <ErrorState message={error} />}
      {schedule.commitments.length > 0 && (
        <ul className="plain-list">
          {schedule.commitments.map((item) => (
            <li key={item.id}>
              <span>
                <strong>{item.title}</strong>
                <br />
                <small className="muted">
                  {dateTime(item.startsAt)} a {dateTime(item.endsAt)}
                </small>
              </span>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Quitar ${item.title}`}
                onClick={() =>
                  void run(async () => {
                    await removeCommitment(item.id);
                    await onSaved();
                  })
                }
              >
                <Trash2 aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function GuideAgendaPage() {
  const toast = useToast();
  const schedule = useResource(getSchedule, []);
  const agenda = useResource(() => getAgenda(laPazDate(), laPazDate(45)), []);
  const { busy, error, run } = useAction();
  const reload = async () => {
    await Promise.all([schedule.reload(), agenda.reload()]);
  };
  const data = schedule.data;
  const bookings = [...(agenda.data?.bookings ?? [])].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );
  return (
    <div className="page-stack">
      <PageHeader
        title="Agenda"
        intro="Define cuándo puedes guiar y revisa tus próximos 45 días."
      />
      {(schedule.error || agenda.error) && (
        <ErrorState
          message={(schedule.error ?? agenda.error)!}
          onRetry={() => void reload()}
        />
      )}
      {error && <ErrorState message={error} />}
      {!data && !schedule.error && <LoadingState />}
      {data && (
        <>
          <section className="page-stack">
            <h2 className="h3">Próximos tours</h2>
            {bookings.length === 0 ? (
              <div className="card">
                <EmptyState title="No tienes tours en los próximos 45 días." />
              </div>
            ) : (
              <ul className="queue">
                {bookings.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/panel/reservas/${item.id}`}
                      className="card queue-item"
                    >
                      <span className="queue-main">
                        <span className="body-strong">{item.routeNameEs}</span>
                        <span className="small muted">
                          {dateTime(item.startsAt)}, {item.peopleCount} personas
                        </span>
                      </span>
                      <StatusBadge tone={BOOKING_STATUS[item.status].tone}>
                        {BOOKING_STATUS[item.status].label}
                      </StatusBadge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <FilterChips<AvailabilityMode>
            label="Modalidad de disponibilidad"
            value={data.mode}
            onChange={(mode) => {
              if (busy) return;
              void run(async () => {
                await setScheduleMode(mode);
                await reload();
                toast('Modalidad actualizada.');
              });
            }}
            options={[
              { value: 'WEEKLY', label: 'Horario semanal' },
              { value: 'BY_DATE', label: 'Por fechas' },
            ]}
          />
          {data.mode === 'WEEKLY' ? (
            <WeeklyEditor
              key={JSON.stringify(data.slots)}
              schedule={data}
              onSaved={reload}
            />
          ) : (
            <DatesEditor schedule={data} onSaved={reload} />
          )}
          <CommitmentsEditor schedule={data} onSaved={reload} />
        </>
      )}
    </div>
  );
}
