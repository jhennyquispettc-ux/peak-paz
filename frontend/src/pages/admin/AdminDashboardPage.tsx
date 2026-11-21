import {
  CalendarX,
  Gavel,
  MessageSquareWarning,
  ShieldAlert,
  ShieldCheck,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  listAgencies,
  listCancellations,
  listComplaints,
  listDisputes,
  listGuidesCount,
  listStrikes,
} from '../../api/adminCases';
import { useResource } from '../../hooks/useResource';
import { dateTime } from '../../lib/format';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';

interface Tile {
  label: string;
  count: number;
  to: string;
  icon: LucideIcon;
}

interface QueueItem {
  key: string;
  kind: string;
  title: string;
  createdAt: string;
  to: string;
}

async function loadSummary() {
  const [guides, agencies, cancellations, disputes, complaints, strikes] =
    await Promise.all([
      listGuidesCount('PENDING'),
      listAgencies('PENDING', 1, 1),
      listCancellations('PENDING', 1, 5),
      listDisputes('OPEN', 1, 5),
      listComplaints('OPEN', 1, 5),
      listStrikes('ACTIVE', 1, 1),
    ]);
  const tiles: Tile[] = [
    {
      label: 'Guías por revisar',
      count: guides.meta.total,
      to: '/admin/verificaciones',
      icon: ShieldCheck,
    },
    {
      label: 'Agencias por revisar',
      count: agencies.meta.total,
      to: '/admin/verificaciones?vista=agencias',
      icon: Building2,
    },
    {
      label: 'Cancelaciones',
      count: cancellations.meta.total,
      to: '/admin/cancelaciones',
      icon: CalendarX,
    },
    {
      label: 'Disputas abiertas',
      count: disputes.meta.total,
      to: '/admin/disputas',
      icon: Gavel,
    },
    {
      label: 'Reclamos abiertos',
      count: complaints.meta.total,
      to: '/admin/reclamos',
      icon: MessageSquareWarning,
    },
    {
      label: 'Strikes activos',
      count: strikes.meta.total,
      to: '/admin/strikes',
      icon: ShieldAlert,
    },
  ];
  const queue: QueueItem[] = [
    ...cancellations.data.map((item) => ({
      key: `c-${item.id}`,
      kind: 'Cancelación',
      title: `${item.bookingCode ?? 'Salida grupal'}, ${item.routeNameEs ?? 'sin ruta'}`,
      createdAt: item.createdAt,
      to: '/admin/cancelaciones',
    })),
    ...disputes.data.map((item) => ({
      key: `d-${item.id}`,
      kind: 'Disputa',
      title: `${item.bookingCode}, ${item.routeNameEs ?? 'sin ruta'}`,
      createdAt: item.createdAt,
      to: '/admin/disputas',
    })),
    ...complaints.data.map((item) => ({
      key: `r-${item.id}`,
      kind: 'Reclamo',
      title: `${item.bookingCode ?? 'Reserva'}, ${item.routeNameEs ?? 'sin ruta'}`,
      createdAt: item.createdAt,
      to: '/admin/reclamos',
    })),
  ]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, 6);
  return { tiles, queue };
}

export default function AdminDashboardPage() {
  const summary = useResource(loadSummary, []);
  return (
    <div className="page-stack">
      <PageHeader
        title="Resumen"
        intro="Lo que necesita una decisión tuya hoy."
      />
      {summary.error && (
        <ErrorState
          message={summary.error}
          onRetry={() => void summary.reload()}
        />
      )}
      {!summary.data && !summary.error && <LoadingState />}
      {summary.data && (
        <>
          <div className="tile-grid">
            {summary.data.tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <Link key={tile.label} to={tile.to} className="card tile">
                  <Icon aria-hidden="true" />
                  <strong>{tile.count}</strong>
                  <span>{tile.label}</span>
                </Link>
              );
            })}
          </div>
          <section className="page-stack">
            <h2 className="h3">Casos más antiguos</h2>
            {summary.data.queue.length === 0 ? (
              <div className="card">
                <EmptyState title="No hay casos pendientes." />
              </div>
            ) : (
              <ul className="queue">
                {summary.data.queue.map((item) => (
                  <li key={item.key}>
                    <Link to={item.to} className="card queue-item">
                      <span className="badge badge-muted">{item.kind}</span>
                      <span className="body-strong">{item.title}</span>
                      <span className="small muted">
                        {dateTime(item.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
