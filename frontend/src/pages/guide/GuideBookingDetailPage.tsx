import { ArrowLeft, CalendarClock, Check, MapPin, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  acceptBooking,
  bookingStart,
  cancelGuideBooking,
  confirmTour,
  getBooking,
  getGuideMe,
  listReschedules,
  proposeReschedule,
  reconfirmBooking,
  rejectBooking,
  type GuideBooking,
  type Reschedule,
} from '../../api/guide';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../hooks/useResource';
import { BOOKING_STATUS } from '../../lib/bookingStatus';
import { dateTime, money, tourDay } from '../../lib/format';
import ErrorState from '../../ui/ErrorState';
import Facts from '../../ui/Facts';
import { Field } from '../../ui/Field';
import LoadingState from '../../ui/LoadingState';
import Modal from '../../ui/Modal';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';

const RESPONSES: Record<Reschedule['response'], string> = {
  PENDING: 'Esperando respuesta',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
  EXPIRED: 'Venció sin respuesta',
};

type Dialog = 'reject' | 'cancel' | 'reschedule' | 'confirm' | null;

function currentPosition() {
  return new Promise<{ latitude: number; longitude: number } | undefined>(
    (resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        () => resolve(undefined),
        { timeout: 8000, maximumAge: 300_000 },
      );
    },
  );
}

function ConfirmTourModal({
  booking,
  onClose,
  onDone,
}: {
  booking: GuideBooking;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [share, setShare] = useState(false);
  const { busy, error, run } = useAction();
  return (
    <Modal
      title="Confirmar tour"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Volver
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const location = share ? await currentPosition() : undefined;
                await confirmTour(booking.id, location);
                await onDone(
                  share && !location
                    ? 'Tour confirmado sin ubicación.'
                    : 'Tour confirmado.',
                );
              })
            }
          >
            {busy ? 'Confirmando…' : 'Confirmar tour'}
          </button>
        </>
      }
    >
      <p>
        Confirma que realizaste <strong>{booking.route.nameEs}</strong>. Puedes
        hacerlo cuando tengas señal, hasta 24 horas después del final del tour.
      </p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={share}
          onChange={(event) => setShare(event.target.checked)}
        />
        <MapPin aria-hidden="true" className="inline-icon" />
        Compartir mi ubicación, es opcional
      </label>
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

function RejectModal({
  booking,
  onClose,
  onDone,
}: {
  booking: GuideBooking;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const { busy, error, run } = useAction();
  return (
    <Modal
      title="Rechazar solicitud"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Volver
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await rejectBooking(booking.id, reason.trim() || undefined);
                await onDone('Solicitud rechazada.');
              })
            }
          >
            Rechazar solicitud
          </button>
        </>
      }
    >
      <Field
        label="Motivo, opcional"
        rows={3}
        maxLength={500}
        value={reason}
        onChange={setReason}
      />
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

function RescheduleModal({
  booking,
  onClose,
  onDone,
}: {
  booking: GuideBooking;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const { busy, error, run } = useAction();
  const valid = newDate.length === 10 && reason.trim().length >= 5;
  return (
    <Modal
      title="Proponer otra fecha"
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
                await proposeReschedule(booking.id, {
                  newDate,
                  reason: reason.trim(),
                });
                await onDone('Propuesta enviada al turista.');
              })
            }
          >
            Enviar propuesta
          </button>
        </>
      }
    >
      <p className="notice">
        Se mantienen la hora y el precio. Si el turista rechaza, la reserva se
        cancela con reembolso del 100 % y el caso pasa a revisión.
      </p>
      <Field
        label="Nueva fecha"
        type="date"
        value={newDate}
        onChange={setNewDate}
      />
      <Field
        label="Motivo"
        rows={3}
        maxLength={200}
        value={reason}
        onChange={setReason}
      />
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

function CancelModal({
  booking,
  onClose,
  onDone,
}: {
  booking: GuideBooking;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [weather, setWeather] = useState(false);
  const [evidence, setEvidence] = useState<File | null>(null);
  const { busy, error, run } = useAction();
  return (
    <Modal
      title="Cancelar reserva"
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
                await cancelGuideBooking(booking.id, {
                  reason: reason.trim(),
                  weather,
                  evidence,
                });
                await onDone('Reserva cancelada.');
              })
            }
          >
            Cancelar reserva
          </button>
        </>
      }
    >
      <p className="notice">
        El turista recibe el 100 % de reembolso. Si no es por clima, el
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
        <label htmlFor="evidence">Justificante, opcional</label>
        <input
          id="evidence"
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

export default function GuideBookingDetailPage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const { busy, error, run } = useAction();
  const detail = useResource(async () => {
    const [booking, reschedules, me] = await Promise.all([
      getBooking(id),
      listReschedules(id),
      getGuideMe(),
    ]);
    return { booking, reschedules, me };
  }, [id]);

  if (detail.error && !detail.data) {
    return (
      <ErrorState message={detail.error} onRetry={() => void detail.reload()} />
    );
  }
  if (!detail.data) return <LoadingState />;

  const { booking, reschedules, me } = detail.data;
  const startsAt = bookingStart(booking).getTime();
  const now = Date.now();
  const isRequest = booking.status === 'REQUESTED';
  const isConfirmed = booking.status === 'CONFIRMED';
  const canReconfirm = isConfirmed && !booking.reconfirmedAt && now < startsAt;
  const canConfirmTour =
    isConfirmed && !booking.guideStartedAt && now >= startsAt - 60 * 60_000;
  const hasPending = reschedules.some((item) => item.response === 'PENDING');
  const canReschedule = isConfirmed && now < startsAt && !hasPending;
  const canCancel =
    booking.status === 'ACCEPTED' || (isConfirmed && now < startsAt);
  const inReview = me.verificationStatus !== 'APPROVED';
  const blockedByDocs = inReview || me.missingDocuments.length > 0;

  const done = async (message: string) => {
    setDialog(null);
    await detail.reload();
    toast(message);
  };

  return (
    <div className="page-stack">
      <Link to="/panel/reservas" className="back-link">
        <ArrowLeft aria-hidden="true" />
        Volver a reservas
      </Link>
      <PageHeader eyebrow={booking.code} title={booking.route.nameEs} />
      <span>
        <StatusBadge tone={BOOKING_STATUS[booking.status].tone}>
          {BOOKING_STATUS[booking.status].label}
        </StatusBadge>
      </span>
      {error && <ErrorState message={error} />}
      {isRequest && blockedByDocs && (
        <p className="form-error" role="alert">
          {inReview ? (
            'Podrás aceptar solicitudes cuando se aprueben tus documentos.'
          ) : (
            <>
              Renueva tus documentos para aceptar esta solicitud.{' '}
              <Link to="/mi-verificacion">Renovar documentos</Link>
            </>
          )}
        </p>
      )}
      {isConfirmed && booking.guideStartedAt && (
        <p className="notice notice-info">
          Ya confirmaste este tour. Falta la confirmación del turista o la
          resolución del caso.
        </p>
      )}

      <div className="action-bar">
        {isRequest && (
          <>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || blockedByDocs}
              onClick={() =>
                void run(async () => {
                  await acceptBooking(booking.id);
                  await detail.reload();
                  toast('Solicitud aceptada. El turista ya puede pagar.');
                })
              }
            >
              <Check aria-hidden="true" />
              Aceptar
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDialog('reject')}
            >
              <X aria-hidden="true" />
              Rechazar
            </button>
          </>
        )}
        {canConfirmTour && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setDialog('confirm')}
          >
            <Check aria-hidden="true" />
            Confirmar tour
          </button>
        )}
        {canReconfirm && !canConfirmTour && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await reconfirmBooking(booking.id);
                await detail.reload();
                toast('Asistencia reconfirmada.');
              })
            }
          >
            <Check aria-hidden="true" />
            Reconfirmar
          </button>
        )}
        {canReschedule && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setDialog('reschedule')}
          >
            <CalendarClock aria-hidden="true" />
            Cambiar fecha
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setDialog('cancel')}
          >
            Cancelar reserva
          </button>
        )}
      </div>

      <section className="card form-stack">
        <h2 className="h3">Detalle del tour</h2>
        <Facts
          items={[
            {
              label: 'Fecha y hora',
              value: tourDay(booking.tourDate, booking.startTime),
            },
            { label: 'Personas', value: booking.peopleCount },
            { label: 'Monto', value: money(booking.totalAmount) },
            {
              label: 'Reconfirmación',
              value: booking.reconfirmedAt
                ? dateTime(booking.reconfirmedAt)
                : 'Pendiente',
            },
            {
              label: 'Tu confirmación',
              value: booking.guideStartedAt
                ? dateTime(booking.guideStartedAt)
                : 'Pendiente',
            },
            {
              label: 'Confirmación del turista',
              value: booking.touristStartedAt
                ? dateTime(booking.touristStartedAt)
                : 'Pendiente',
            },
            ...(booking.respondBy && isRequest
              ? [
                  {
                    label: 'Responde antes de',
                    value: dateTime(booking.respondBy),
                  },
                ]
              : []),
            ...(booking.cancellationReason
              ? [
                  {
                    label: 'Motivo de cancelación',
                    value: booking.cancellationReason,
                  },
                ]
              : []),
          ]}
        />
      </section>

      <section className="card form-stack">
        <h2 className="h3">Turista</h2>
        <Facts
          items={[
            {
              label: 'Nombre',
              value: `${booking.tourist.firstName} ${booking.tourist.lastName}`,
            },
            { label: 'País', value: booking.tourist.country ?? 'Sin dato' },
            {
              label: 'Correo',
              value: booking.tourist.email ?? 'Visible al confirmar el pago',
            },
            {
              label: 'Teléfono',
              value: booking.tourist.phone ?? 'Visible al confirmar el pago',
            },
          ]}
        />
      </section>

      {reschedules.length > 0 && (
        <section className="card form-stack">
          <h2 className="h3">Cambios de fecha</h2>
          <ul className="review-history">
            {reschedules.map((item) => (
              <li key={item.id}>
                <strong>
                  {tourDay(item.previousDate)} a {tourDay(item.newDate)}
                </strong>
                <span className="small muted">{RESPONSES[item.response]}</span>
                <p>{item.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dialog === 'confirm' && (
        <ConfirmTourModal
          booking={booking}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog === 'reject' && (
        <RejectModal
          booking={booking}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog === 'reschedule' && (
        <RescheduleModal
          booking={booking}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog === 'cancel' && (
        <CancelModal
          booking={booking}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
    </div>
  );
}
