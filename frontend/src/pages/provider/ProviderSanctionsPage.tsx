import { ShieldCheck, TriangleAlert } from 'lucide-react';
import type { ProviderStrike, SanctionsSummary } from '../../api/guide';
import { useResource } from '../../hooks/useResource';
import { dateOnly, money, tourDay } from '../../lib/format';
import DataTable, { type Column } from '../../ui/DataTable';
import EmptyState from '../../ui/EmptyState';
import ErrorState from '../../ui/ErrorState';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import StatusBadge, { type StatusTone } from '../../ui/StatusBadge';

const REASONS: Record<ProviderStrike['reason'], string> = {
  CANCELLED_WITHOUT_WEATHER: 'Cancelación sin motivo de clima',
  NO_SHOW: 'No se presentó',
  COMPLAINT: 'Reclamo aceptado',
};

const STATUS: Record<
  ProviderStrike['status'],
  { label: string; tone: StatusTone }
> = {
  ACTIVE: { label: 'Activo', tone: 'danger' },
  REVERTED: { label: 'Anulado', tone: 'muted' },
  EXPIRED: { label: 'Vencido', tone: 'muted' },
};

const COLUMNS: Column<ProviderStrike>[] = [
  { key: 'reason', header: 'Motivo', render: (row) => REASONS[row.reason] },
  { key: 'weight', header: 'Peso', render: (row) => row.weight },
  {
    key: 'case',
    header: 'Caso',
    nowrap: true,
    render: (row) => row.bookingCode ?? 'Salida grupal',
  },
  {
    key: 'date',
    header: 'Tour',
    nowrap: true,
    render: (row) => tourDay(row.tourDate),
  },
  {
    key: 'expires',
    header: 'Vence',
    nowrap: true,
    render: (row) => dateOnly(row.expiresAt),
  },
  {
    key: 'status',
    header: 'Estado',
    render: (row) => (
      <StatusBadge tone={STATUS[row.status].tone}>
        {STATUS[row.status].label}
      </StatusBadge>
    ),
  },
];

export default function ProviderSanctionsPage({
  load,
}: {
  load: () => Promise<SanctionsSummary>;
}) {
  const summary = useResource(load, []);
  const data = summary.data;
  const hidden = data?.hiddenUntil && new Date(data.hiddenUntil) > new Date();
  return (
    <div className="page-stack">
      <PageHeader
        title="Sanciones"
        intro="Tus strikes, su vigencia y las multas por descontar."
      />
      {summary.error && (
        <ErrorState
          message={summary.error}
          onRetry={() => void summary.reload()}
        />
      )}
      {!data && !summary.error && <LoadingState />}
      {data && (
        <>
          {hidden && (
            <p className="form-error" role="status">
              <TriangleAlert aria-hidden="true" />
              Tu perfil no aparece en el catálogo hasta el{' '}
              {dateOnly(data.hiddenUntil!)}.
            </p>
          )}
          <div className="tile-grid">
            <div className="card tile">
              <strong>
                {data.activeStrikes} de {data.strikesToSuspend}
              </strong>
              <span>Strikes activos</span>
            </div>
            <div className="card tile">
              <strong>{money(data.pendingFines)}</strong>
              <span>Multas por descontar</span>
            </div>
          </div>
          <p className="notice">
            Con {data.strikesToHide} strikes activos tu perfil se oculta del
            catálogo. Con {data.strikesToSuspend} la suspensión es permanente.
          </p>
          {data.strikes.length === 0 ? (
            <div className="card">
              <EmptyState icon={ShieldCheck} title="No tienes strikes." />
            </div>
          ) : (
            <DataTable
              caption="Mis strikes"
              columns={COLUMNS}
              rows={data.strikes}
              rowKey={(row) => row.id}
            />
          )}
        </>
      )}
    </div>
  );
}
