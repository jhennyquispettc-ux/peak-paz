import { ChevronRight, Compass } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listMyBookings } from '../../api/tourist';
import { useResource } from '../../hooks/useResource';
import { useI18n } from '../../i18n/I18nContext';
import type { BookingStatus } from '../../lib/bookingStatus';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import FilterChips from '../../ui/FilterChips';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import Pagination from '../../ui/Pagination';
import StatusBadge from '../../ui/StatusBadge';
import { bolivianos, dayLabel, STATUS_LABELS } from './touristFormat';

type Filter = 'ALL' | 'ACCEPTED' | 'CONFIRMED' | 'COMPLETED';

export default function MyBookingsPage() {
  const { locale, pick, dateLocale } = useI18n();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const list = useResource(
    () =>
      listMyBookings(
        page,
        filter === 'ALL' ? undefined : (filter as BookingStatus),
      ),
    [page, filter],
  );
  const rows = list.data?.data ?? [];
  return (
    <div className="page-stack">
      <PageHeader
        title={pick('Mis reservas', 'My bookings')}
        intro={pick(
          'Tus tours, pagos y todo lo que necesitas para el día de la salida.',
          'Your tours, payments and everything you need for the big day.',
        )}
      />
      <FilterChips
        label={pick('Estado de la reserva', 'Booking status')}
        value={filter}
        onChange={(next) => {
          setFilter(next);
          setPage(1);
        }}
        options={[
          { value: 'ALL', label: pick('Todas', 'All') },
          { value: 'ACCEPTED', label: pick('Por pagar', 'Payment due') },
          { value: 'CONFIRMED', label: pick('Confirmadas', 'Confirmed') },
          { value: 'COMPLETED', label: pick('Completadas', 'Completed') },
        ]}
      />
      {list.error && (
        <ErrorState message={list.error} onRetry={() => void list.reload()} />
      )}
      {!list.data && !list.error && <LoadingState />}
      {list.data && rows.length === 0 && (
        <div className="card">
          <EmptyState
            icon={Compass}
            title={pick(
              'Aún no tienes reservas aquí.',
              'No bookings here yet.',
            )}
          >
            <Link to="/rutas">{pick('Explorar rutas', 'Explore trails')}</Link>
          </EmptyState>
        </div>
      )}
      {rows.length > 0 && (
        <ul className="queue">
          {rows.map((booking) => (
            <li key={booking.id}>
              <Link to={`/reservas/${booking.id}`} className="card queue-item">
                <span className="queue-main">
                  <span className="body-strong">
                    {locale === 'en'
                      ? booking.route.nameEn
                      : booking.route.nameEs}
                  </span>
                  <span className="small muted">
                    {dayLabel(booking.tourDate, booking.startTime, dateLocale)},{' '}
                    {booking.peopleCount} {pick('personas', 'people')},{' '}
                    {bolivianos(booking.totalAmount, dateLocale)}
                  </span>
                </span>
                <StatusBadge tone={STATUS_LABELS[booking.status].tone}>
                  {STATUS_LABELS[booking.status][locale]}
                </StatusBadge>
                <ChevronRight aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {list.data && (
        <Pagination
          page={page}
          totalPages={list.data.meta.totalPages}
          onChange={setPage}
        />
      )}
    </div>
  );
}
