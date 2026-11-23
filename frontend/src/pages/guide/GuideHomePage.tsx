import { CalendarCheck, ChevronRight, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  bookingStart,
  getGuideMe,
  listGuideBookings,
  type GuideBooking,
} from '../../api/guide';
import { useAuth } from '../../auth/AuthContext';
import { useResource } from '../../hooks/useResource';
import { BOOKING_STATUS } from '../../lib/bookingStatus';
import { tourDay } from '../../lib/format';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';

const HOUR = 60 * 60_000;

function pendingAction(booking: GuideBooking, now: number) {
  const startsAt = bookingStart(booking).getTime();
  if (booking.status === 'REQUESTED') return 'Responde la solicitud';
  if (booking.status === 'CONFIRMED') {
    if (!booking.guideStartedAt && now >= startsAt - HOUR) {
      return 'Confirma el tour';
    }
    if (
      !booking.reconfirmedAt &&
      now < startsAt &&
      startsAt - now <= 72 * HOUR
    ) {
      return 'Reconfirma tu asistencia';
    }
  }
  return null;
}

async function loadHome() {
  const [me, requested, confirmed, running] = await Promise.all([
    getGuideMe(),
    listGuideBookings(1, 'REQUESTED', 20),
    listGuideBookings(1, 'CONFIRMED', 50),
    listGuideBookings(1, 'IN_PROGRESS', 20),
  ]);
  const bookings = [...requested.data, ...running.data, ...confirmed.data].sort(
    (a, b) => bookingStart(a).getTime() - bookingStart(b).getTime(),
  );
  return { me, bookings };
}

function BookingRow({
  booking,
  action,
}: {
  booking: GuideBooking;
  action?: string | null;
}) {
  return (
    <li>
      <Link to={`/panel/reservas/${booking.id}`} className="card queue-item">
        <span className="queue-main">
          <span className="body-strong">{booking.route.nameEs}</span>
          <span className="small muted">
            {tourDay(booking.tourDate, booking.startTime)},{' '}
            {booking.peopleCount} personas
          </span>
          {action && <span className="small action-hint">{action}</span>}
        </span>
        <StatusBadge tone={BOOKING_STATUS[booking.status].tone}>
          {BOOKING_STATUS[booking.status].label}
        </StatusBadge>
        <ChevronRight aria-hidden="true" />
      </Link>
    </li>
  );
}

export default function GuideHomePage() {
  const { user } = useAuth();
  const home = useResource(loadHome, []);
  const now = Date.now();
  const bookings = home.data?.bookings ?? [];
  const actionable = bookings.filter((item) => pendingAction(item, now));
  const upcoming = bookings
    .filter((item) => !pendingAction(item, now))
    .slice(0, 5);
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Panel del guía"
        title={`Hola, ${user?.firstName ?? ''}`}
        intro="Lo que necesita tu atención y tus próximos tours."
      />
      {home.error && (
        <ErrorState message={home.error} onRetry={() => void home.reload()} />
      )}
      {!home.data && !home.error && <LoadingState />}
      {home.data && (
        <>
          {home.data.me.verificationStatus !== 'APPROVED' && (
            <p className="notice notice-info" role="status">
              Tus documentos están en revisión. Puedes atender tus reservas
              actuales. Volverás al catálogo y a recibir solicitudes cuando el
              administrador los apruebe.
            </p>
          )}
          {home.data.me.verificationStatus === 'APPROVED' &&
            home.data.me.missingDocuments.length > 0 && (
              <div className="form-error" role="status">
                <TriangleAlert aria-hidden="true" />
                <span>
                  Tienes documentos vencidos. Puedes atender tus reservas
                  actuales, pero no apareces en el catálogo ni puedes aceptar
                  solicitudes nuevas.{' '}
                  <Link to="/mi-verificacion">Renovar documentos</Link>
                </span>
              </div>
            )}
          <section className="page-stack">
            <h2 className="h3">Por hacer</h2>
            {actionable.length === 0 ? (
              <div className="card">
                <EmptyState icon={CalendarCheck} title="Estás al día." />
              </div>
            ) : (
              <ul className="queue">
                {actionable.map((item) => (
                  <BookingRow
                    key={item.id}
                    booking={item}
                    action={pendingAction(item, now)}
                  />
                ))}
              </ul>
            )}
          </section>
          <section className="page-stack">
            <h2 className="h3">En curso y próximos</h2>
            {upcoming.length === 0 ? (
              <div className="card">
                <EmptyState title="No tienes más tours programados." />
              </div>
            ) : (
              <ul className="queue">
                {upcoming.map((item) => (
                  <BookingRow key={item.id} booking={item} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
