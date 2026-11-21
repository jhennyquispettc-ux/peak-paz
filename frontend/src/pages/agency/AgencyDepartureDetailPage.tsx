import { ArrowLeft, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addManualBooking,
  cancelDeparture,
  getMyDeparture,
  type Participant,
} from '../../api/agency';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../hooks/useResource';
import { BOOKING_STATUS, type BookingStatus } from '../../lib/bookingStatus';
import { dateTime, money, tourDay } from '../../lib/format';
import DataTable, { type Column } from '../../ui/DataTable';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import Facts from '../../ui/Facts';
import { Field } from '../../ui/Field';
import LoadingState from '../../ui/LoadingState';
import Modal from '../../ui/Modal';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';
import { DEPARTURE_STATUS } from './departureLabels';

const COLUMNS: Column<Participant>[] = [
  { key: 'name', header: 'Nombre', render: (row) => row.name },
  { key: 'people', header: 'Personas', render: (row) => row.peopleCount },
  {
    key: 'source',
    header: 'Origen',
    render: (row) => (row.source === 'MANUAL' ? 'Manual' : 'Web'),
  },
  {
    key: 'contact',
    header: 'Contacto',
    render: (row) => row.contact ?? 'Visible al confirmar el pago',
  },
  {
    key: 'status',
    header: 'Estado',
    render: (row) => {
      const status = BOOKING_STATUS[row.status as BookingStatus];
      return status ? (
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      ) : (
        row.status
      );
    },
  },
];

function ManualModal({
  departureId,
  seatsLeft,
  onClose,
  onDone,
}: {
  departureId: string;
  seatsLeft: number;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [people, setPeople] = useState('1');
  const [contact, setContact] = useState('');
  const { busy, error, run } = useAction();
  const count = Number(people);
  const valid =
    Number.isInteger(count) &&
    count >= 1 &&
    count <= seatsLeft &&
    contact.trim().length >= 3;
  return (
    <Modal
      title="Registrar inscripción manual"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Volver
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!valid || busy}
            onClick={() =>
              void run(async () => {
                await addManualBooking(departureId, {
                  peopleCount: count,
                  contact: contact.trim(),
                });
                await onDone();
              })
            }
          >
            Registrar
          </button>
        </>
      }
    >
      <p className="notice">
        Para personas que te pagaron fuera de la plataforma. Ocupan cupo, pero
        no generan cobro ni liquidación.
      </p>
      <Field
        label="Personas"
        type="number"
        min={1}
        max={seatsLeft}
        step="1"
        hint={`Quedan ${seatsLeft} cupos.`}
        value={people}
        onChange={setPeople}
      />
      <Field
        label="Nombre y contacto"
        maxLength={200}
        placeholder="Carlos Pérez, +591 70000000"
        value={contact}
        onChange={setContact}
      />
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

function CancelModal({
  departureId,
  onClose,
  onDone,
}: {
  departureId: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [weather, setWeather] = useState(false);
  const [evidence, setEvidence] = useState<File | null>(null);
  const { busy, error, run } = useAction();
  return (
    <Modal
      title="Cancelar salida"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Volver
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy || reason.trim().length < 5}
            onClick={() =>
              void run(async () => {
                await cancelDeparture(departureId, {
                  reason: reason.trim(),
                  weather,
                  evidence,
                });
                await onDone();
              })
            }
          >
            Cancelar salida
          </button>
        </>
      }
    >
      <p className="notice">
        Todos los inscritos reciben el 100 %. Si no es por clima, el
        administrador revisa tu motivo y puede aplicar un strike o una multa.
      </p>
      <Field
        label="Motivo"
        rows={3}
        maxLength={500}
        value={reason}
        onChange={setReason}
      />
      <label className="check-row">
        <input
          type="checkbox"
          checked={weather}
          onChange={(event) => setWeather(event.target.checked)}
        />
        Es por mal clima
      </label>
      <div className="field">
        <label htmlFor="departureEvidence">Justificante, opcional</label>
        <input
          id="departureEvidence"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(event) => setEvidence(event.target.files?.[0] ?? null)}
        />
        <span className="field-hint">PDF, JPG o PNG de hasta 5 MB.</span>
      </div>
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

export default function AgencyDepartureDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const departure = useResource(() => getMyDeparture(id), [id]);
  const [dialog, setDialog] = useState<'manual' | 'cancel' | null>(null);
  const data = departure.data;

  if (departure.error && !data) {
    return (
      <ErrorState
        message={departure.error}
        onRetry={() => void departure.reload()}
      />
    );
  }
  if (!data) return <LoadingState />;

  const closed = new Date(data.closesAt) <= new Date();
  const canAdd = data.status === 'PUBLISHED' && !closed && data.seatsLeft > 0;
  const canCancel = data.status === 'PUBLISHED' || data.status === 'CONFIRMED';
  const percent = Math.min((data.seatsTaken / data.maxPeople) * 100, 100);
  const minMark = (data.minPeople / data.maxPeople) * 100;

  return (
    <div className="page-stack">
      <Link to="/panel/salidas" className="back-link">
        <ArrowLeft aria-hidden="true" />
        Volver a salidas
      </Link>
      <PageHeader
        eyebrow={tourDay(data.departureDate, data.meetingTime)}
        title={data.route.nameEs}
      />
      <span>
        <StatusBadge tone={DEPARTURE_STATUS[data.status].tone}>
          {DEPARTURE_STATUS[data.status].label}
        </StatusBadge>
      </span>
      {(canAdd || canCancel) && (
        <div className="action-bar">
          {canAdd && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setDialog('manual')}
            >
              <UserPlus aria-hidden="true" />
              Inscribir manual
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDialog('cancel')}
            >
              Cancelar salida
            </button>
          )}
        </div>
      )}
      <section className="card form-stack">
        <h2 className="h3">
          {data.seatsTaken} de {data.maxPeople} cupos
        </h2>
        <div
          className="seat-bar"
          role="img"
          aria-label={`${data.seatsTaken} inscritos, mínimo ${data.minPeople}, máximo ${data.maxPeople}`}
        >
          <span className="seat-fill" style={{ width: `${percent}%` }} />
          <span className="seat-min" style={{ left: `${minMark}%` }} />
        </div>
        <p className="small muted">
          {data.seatsTaken >= data.minPeople
            ? 'Ya se alcanzó el mínimo de personas.'
            : `Faltan ${data.minPeople - data.seatsTaken} para el mínimo de ${data.minPeople}.`}
        </p>
        <Facts
          items={[
            { label: 'Punto de encuentro', value: data.meetingPoint },
            { label: 'Guía a cargo', value: data.guideName },
            { label: 'Precio por persona', value: money(data.pricePerPerson) },
            {
              label: 'Cierre de inscripciones',
              value: dateTime(data.closesAt),
            },
          ]}
        />
      </section>
      <section className="page-stack">
        <h2 className="h3">Inscritos</h2>
        {data.participants.length === 0 ? (
          <div className="card">
            <EmptyState title="Todavía no hay inscritos." />
          </div>
        ) : (
          <DataTable
            caption="Personas inscritas"
            columns={COLUMNS}
            rows={data.participants}
            rowKey={(row) => row.bookingId}
          />
        )}
      </section>
      {dialog === 'manual' && (
        <ManualModal
          departureId={data.id}
          seatsLeft={data.seatsLeft}
          onClose={() => setDialog(null)}
          onDone={async () => {
            setDialog(null);
            await departure.reload();
            toast('Inscripción registrada.');
          }}
        />
      )}
      {dialog === 'cancel' && (
        <CancelModal
          departureId={data.id}
          onClose={() => setDialog(null)}
          onDone={async () => {
            setDialog(null);
            await departure.reload();
            toast('Salida cancelada. Los inscritos reciben su reembolso.');
          }}
        />
      )}
    </div>
  );
}
