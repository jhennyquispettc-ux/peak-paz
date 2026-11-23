import type { ProviderPayout } from '../../api/guide';
import type { Page } from '../../api/types';
import { useCaseList } from '../../hooks/useCaseList';
import { dateOnly, money, tourDay } from '../../lib/format';
import { PAYOUT_STAGES } from '../../lib/payoutStage';
import type { Column } from '../../ui/DataTable';
import FilterChips from '../../ui/FilterChips';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import CaseTable from '../admin/CaseTable';

const COLUMNS: Column<ProviderPayout>[] = [
  {
    key: 'code',
    header: 'Reserva',
    nowrap: true,
    render: (row) => row.bookingCode,
  },
  {
    key: 'route',
    header: 'Ruta',
    wideOnly: true,
    render: (row) => row.routeNameEs ?? '',
  },
  {
    key: 'date',
    header: 'Tour',
    nowrap: true,
    render: (row) => tourDay(row.tourDate),
  },
  {
    key: 'gross',
    header: 'Monto',
    align: 'right',
    nowrap: true,
    render: (row) => money(row.grossAmount),
  },
  {
    key: 'commission',
    wideOnly: true,
    header: 'Comisión',
    align: 'right',
    nowrap: true,
    render: (row) => money(row.commissionAmount),
  },
  {
    key: 'penalty',
    header: 'Descuentos',
    align: 'right',
    nowrap: true,
    render: (row) => money(row.penaltyDeduction),
  },
  {
    key: 'net',
    header: 'Recibes',
    align: 'right',
    nowrap: true,
    render: (row) => <strong>{money(row.netAmount)}</strong>,
  },
  {
    key: 'stage',
    header: 'Estado',
    render: (row) => (
      <span className="stage-cell">
        <StatusBadge tone={PAYOUT_STAGES[row.stage].tone}>
          {PAYOUT_STAGES[row.stage].label}
        </StatusBadge>
        {row.stage === 'WAITING' && (
          <small>Desde {dateOnly(row.payableAt)}</small>
        )}
        {row.stage === 'PAID' && row.paidAt && (
          <small>{dateOnly(row.paidAt)}</small>
        )}
      </span>
    ),
  },
];

export default function ProviderPayoutsPage({
  load,
}: {
  load: (
    status: 'PENDING' | 'PAID',
    page: number,
  ) => Promise<Page<ProviderPayout>>;
}) {
  const { filter, setFilter, page, setPage, list } = useCaseList(
    load,
    'PENDING' as 'PENDING' | 'PAID',
  );
  return (
    <div className="page-stack">
      <PageHeader
        title="Liquidaciones"
        intro="Tu pago queda disponible 72 horas después del tour, si no hay reclamos."
      />
      <FilterChips
        label="Estado de pago"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'PENDING', label: 'Pendientes' },
          { value: 'PAID', label: 'Pagadas' },
        ]}
      />
      <CaseTable
        caption="Mis liquidaciones"
        columns={COLUMNS}
        list={list}
        page={page}
        onPage={setPage}
        emptyTitle="No tienes liquidaciones en este estado."
      />
    </div>
  );
}
