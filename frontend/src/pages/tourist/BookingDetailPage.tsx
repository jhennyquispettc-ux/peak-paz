import { ArrowLeft, Check, CreditCard, LifeBuoy, Star, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  acceptReschedule,
  bookingStartTime,
  confirmMyTour,
  getMyBooking,
  getMyComplaint,
  getMyReview,
  listMyHelp,
  listMyReschedules,
  rejectReschedule,
} from '../../api/tourist';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../hooks/useResource';
import { useI18n } from '../../i18n/I18nContext';
import ConfirmDialog from '../../ui/ConfirmDialog';
import ErrorState from '../../ui/ErrorState';
import Facts from '../../ui/Facts';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';
import { CancelDialog, ReportDialog, ReviewDialog } from './BookingDialogs';
import {
  bolivianos,
  dayLabel,
  momentLabel,
  STATUS_LABELS,
} from './touristFormat';

type Dialog = 'cancel' | 'report' | 'review' | 'rejectDate' | null;

const HOUR = 60 * 60_000;

async function loadDetail(id: string) {
  const booking = await getMyBooking(id);
  const isPrivate = booking.type === 'PRIVATE';
  const [reschedules, complaint, review, help] = await Promise.all([
    isPrivate ? listMyReschedules(id) : Promise.resolve([]),
    getMyComplaint(id),
    getMyReview(id),
    listMyHelp(id),
  ]);
  return { booking, reschedules, complaint, review, help };
}

export default function BookingDetailPage() {
  const { id = '' } = useParams();
  const { locale, pick, dateLocale } = useI18n();
  const toast = useToast();
  const detail = useResource(() => loadDetail(id), [id]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const { busy, error, run } = useAction();

  if (detail.error && !detail.data) {
    return (
      <ErrorState message={detail.error} onRetry={() => void detail.reload()} />
    );
  }
  if (!detail.data) return <LoadingState />;

  const { booking, reschedules, complaint, review, help } = detail.data;
  const now = Date.now();
  const startsAt = bookingStartTime(booking).getTime();
  const isRunning =
    booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS';
  const started = now >= startsAt;
  const pendingDate = reschedules.find((item) => item.response === 'PENDING');
  const canPay = booking.status === 'ACCEPTED';
  const canCancel =
    booking.status === 'REQUESTED' ||
    booking.status === 'ACCEPTED' ||
    (booking.status === 'CONFIRMED' && !started);
  const canConfirm =
    isRunning &&
    booking.type === 'PRIVATE' &&
    !booking.touristStartedAt &&
    now >= startsAt - HOUR;
  const canReport =
    (isRunning && started) || (booking.status === 'COMPLETED' && !complaint);
  const canReview = booking.status === 'COMPLETED' && !review;
  const provider = booking.agency
    ? booking.agency.legalName
    : booking.guide
      ? `${booking.guide.firstName} ${booking.guide.lastName}`
      : '';

  const done = async (message: string) => {
    setDialog(null);
    await detail.reload();
    toast(message);
  };

  const complaintStatus = {
    OPEN: pick('En revisión', 'Under review'),
    ACCEPTED: pick('Aceptado', 'Accepted'),
    REJECTED: pick('Rechazado', 'Rejected'),
  };

  return (
    <div className="page-stack">
      <Link to="/reservas" className="back-link">
        <ArrowLeft aria-hidden="true" />
        {pick('Mis reservas', 'My bookings')}
      </Link>
      <PageHeader
        eyebrow={booking.code}
        title={locale === 'en' ? booking.route.nameEn : booking.route.nameEs}
      />
      <span>
        <StatusBadge tone={STATUS_LABELS[booking.status].tone}>
          {STATUS_LABELS[booking.status][locale]}
        </StatusBadge>
      </span>
      {error && <ErrorState message={error} />}

      {booking.status === 'REQUESTED' && (
        <p className="notice notice-info">
          {pick(
            'Tu solicitud está con el guía. Te avisaremos cuando responda.',
            'Your request is with the guide. We will let you know when they answer.',
          )}
        </p>
      )}
      {canPay && booking.payBy && (
        <p className="notice notice-info">
          {pick('Paga antes de: ', 'Pay before: ')}
          {momentLabel(booking.payBy, dateLocale)}
        </p>
      )}
      {booking.status === 'CONFIRMED' && !started && !booking.reconfirmedAt && (
        <p className="notice">
          {pick(
            'El guía debe reconfirmar hasta 24 horas antes. Si no lo hace, puedes cancelar con el 100 %.',
            'The guide must reconfirm up to 24 hours before. If not, you can cancel with 100%.',
          )}
        </p>
      )}
      {isRunning && booking.guideStartedAt && !booking.touristStartedAt && (
        <p className="notice notice-info">
          {pick(
            'El guía confirmó este tour. Confírmalo tú también o repórtalo si hubo un problema.',
            'The guide confirmed this tour. Please confirm it too, or report a problem.',
          )}
        </p>
      )}

      {pendingDate && (
        <section className="card form-stack">
          <h2 className="h3">
            {pick(
              'El guía propone otra fecha',
              'The guide proposes a new date',
            )}
          </h2>
          <Facts
            items={[
              {
                label: pick('Fecha actual', 'Current date'),
                value: dayLabel(pendingDate.previousDate, null, dateLocale),
              },
              {
                label: pick('Nueva fecha', 'New date'),
                value: (
                  <strong>
                    {dayLabel(pendingDate.newDate, null, dateLocale)}
                  </strong>
                ),
              },
              {
                label: pick('Responde antes de', 'Answer before'),
                value: momentLabel(pendingDate.respondBy, dateLocale),
              },
              { label: pick('Motivo', 'Reason'), value: pendingDate.reason },
            ]}
          />
          <div className="action-bar">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await acceptReschedule(booking.id, pendingDate.id);
                  await detail.reload();
                  toast(pick('Fecha actualizada.', 'Date updated.'));
                })
              }
            >
              <Check aria-hidden="true" />
              {pick('Aceptar fecha', 'Accept date')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setDialog('rejectDate')}
            >
              <X aria-hidden="true" />
              {pick('Rechazar', 'Reject')}
            </button>
          </div>
        </section>
      )}

      <div className="action-bar">
        {canPay && (
          <Link
            to={`/reservas/${booking.id}/pagar`}
            className="btn btn-primary"
          >
            <CreditCard aria-hidden="true" />
            {pick('Pagar', 'Pay')}
          </Link>
        )}
        {canConfirm && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await confirmMyTour(booking.id);
                await detail.reload();
                toast(pick('Tour confirmado.', 'Tour confirmed.'));
              })
            }
          >
            <Check aria-hidden="true" />
            {pick('Confirmar tour', 'Confirm tour')}
          </button>
        )}
        {canReview && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setDialog('review')}
          >
            <Star aria-hidden="true" />
            {pick('Calificar', 'Rate')}
          </button>
        )}
        {canReport && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setDialog('report')}
          >
            <LifeBuoy aria-hidden="true" />
            {pick('Reportar problema', 'Report problem')}
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setDialog('cancel')}
          >
            {pick('Cancelar reserva', 'Cancel booking')}
          </button>
        )}
      </div>

      <section className="card form-stack">
        <h2 className="h3">{pick('Detalle', 'Details')}</h2>
        <Facts
          items={[
            {
              label: pick('Fecha y hora', 'Date and time'),
              value: dayLabel(booking.tourDate, booking.startTime, dateLocale),
            },
            {
              label: pick('Tipo', 'Type'),
              value:
                booking.type === 'GROUP'
                  ? pick('Salida grupal', 'Group departure')
                  : pick('Tour con guía', 'Private tour'),
            },
            {
              label: booking.agency
                ? pick('Agencia', 'Agency')
                : pick('Guía', 'Guide'),
              value: provider,
            },
            { label: pick('Personas', 'People'), value: booking.peopleCount },
            {
              label: pick('Total', 'Total'),
              value: bolivianos(booking.totalAmount, dateLocale),
            },
            ...(booking.cancellationReason
              ? [
                  {
                    label: pick('Motivo de cancelación', 'Cancellation reason'),
                    value: booking.cancellationReason,
                  },
                ]
              : []),
          ]}
        />
        <Link to={`/rutas/${booking.route.slug}`} className="small">
          {pick('Ver información de la ruta', 'See trail information')}
        </Link>
      </section>

      {help.length > 0 && (
        <section className="card form-stack">
          <h2 className="h3">{pick('Pedidos de ayuda', 'Help requests')}</h2>
          <ul className="review-history">
            {help.map((item) => (
              <li key={item.id}>
                <strong>
                  {item.status === 'OPEN'
                    ? pick('En atención', 'Being handled')
                    : pick('Atendido', 'Handled')}
                </strong>
                <span className="small muted">
                  {momentLabel(item.createdAt, dateLocale)}
                </span>
                <p>{item.description}</p>
                {item.adminNote && <p className="small">{item.adminNote}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {complaint && (
        <section className="card form-stack">
          <h2 className="h3">{pick('Tu reclamo', 'Your complaint')}</h2>
          <Facts
            items={[
              {
                label: pick('Estado', 'Status'),
                value: complaintStatus[complaint.status],
              },
              ...(complaint.refundPercent !== null
                ? [
                    {
                      label: pick('Reembolso', 'Refund'),
                      value: `${complaint.refundPercent} %`,
                    },
                  ]
                : []),
              ...(complaint.resolution
                ? [
                    {
                      label: pick('Resolución', 'Resolution'),
                      value: complaint.resolution,
                    },
                  ]
                : []),
            ]}
          />
          <p>{complaint.description}</p>
        </section>
      )}

      {review && (
        <section className="card form-stack">
          <h2 className="h3">{pick('Tu reseña', 'Your review')}</h2>
          <span
            className="stars"
            role="img"
            aria-label={pick(
              `${review.rating} de 5 estrellas`,
              `${review.rating} of 5 stars`,
            )}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                key={value}
                aria-hidden="true"
                fill={value <= review.rating ? 'currentColor' : 'none'}
              />
            ))}
          </span>
          {review.comment && <p>{review.comment}</p>}
        </section>
      )}

      {dialog === 'cancel' && (
        <CancelDialog
          booking={booking}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog === 'report' && (
        <ReportDialog
          booking={booking}
          hasComplaint={Boolean(complaint)}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog === 'review' && (
        <ReviewDialog
          booking={booking}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog === 'rejectDate' && pendingDate && (
        <ConfirmDialog
          title={pick('Rechazar nueva fecha', 'Reject new date')}
          confirmLabel={pick('Rechazar fecha', 'Reject date')}
          cancelLabel={pick('Volver', 'Back')}
          destructive
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await rejectReschedule(booking.id, pendingDate.id);
            await detail.reload();
            toast(
              pick(
                'Reserva cancelada con reembolso del 100 %.',
                'Booking cancelled with a full refund.',
              ),
            );
          }}
        >
          <p>
            {pick(
              'La reserva se cancela y recibes el 100 % de lo pagado.',
              'The booking is cancelled and you get 100% of what you paid.',
            )}
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
