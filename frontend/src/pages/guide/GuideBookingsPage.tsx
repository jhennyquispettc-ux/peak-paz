import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listGuideBookings } from '../../api/guide';
import { useResource } from '../../hooks/useResource';
import { BOOKING_STATUS, type BookingStatus } from '../../lib/bookingStatus';
import { money, tourDay } from '../../lib/format';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import FilterChips from '../../ui/FilterChips';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import Pagination from '../../ui/Pagination';
import StatusBadge from '../../ui/StatusBadge';

type Filter =
  'ALL' | 'REQUESTED' | 'ACCEPTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'REQUESTED', label: 'Solicitudes' },
  { value: 'ACCEPTED', label: 'Por pagar' },
  { value: 'CONFIRMED', label: 'Confirmadas' },
  { value: 'IN_PROGRESS', label: 'En curso' },
  { value: 'COMPLETED', label: 'Completadas' },
];

export default function GuideBookingsPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const list = useResource(
    () =>
      listGuideBookings(
        page,
        filter === 'ALL' ? undefined : (filter as BookingStatus),
      ),
    [page, filter],
  );
  const rows = list.data?.data ?? [];
  return (
    <div className="page-stack">
      <PageHeader
        title="Reservas"
        intro="Responde solicitudes y gestiona cada tour."
      />
      <FilterChips
        label="Estado de la reserva"
        value={filter}
        options={FILTERS}
        onChange={(next) => {
          setFilter(next);
          setPage(1);
        }}
      />
      {list.error && (
        <ErrorState message={list.error} onRetry={() => void list.reload()} />
      )}
      {!list.data && !list.error && <LoadingState />}
      {list.data && rows.length === 0 && (
        <div className="card">
          <EmptyState title="No tienes reservas en este estado." />
        </div>
      )}
      {rows.length > 0 && (
        <ul className="queue">
          {rows.map((booking) => (
            <li key={booking.id}>
              <Link
                to={`/panel/reservas/${booking.id}`}
                className="card queue-item"
              >
                <span className="queue-main">
                  <span className="body-strong">{booking.route.nameEs}</span>
                  <span className="small muted">
                    {booking.code},{' '}
                    {tourDay(booking.tourDate, booking.startTime)},{' '}
                    {booking.peopleCount} personas, {money(booking.totalAmount)}
                  </span>
                </span>
                <StatusBadge tone={BOOKING_STATUS[booking.status].tone}>
                  {BOOKING_STATUS[booking.status].label}
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
