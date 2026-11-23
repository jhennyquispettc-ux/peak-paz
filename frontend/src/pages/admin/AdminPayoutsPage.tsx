import { useMemo, useState } from 'react';
import {
  listPayouts,
  markPayoutPaid,
  type AdminPayout,
} from '../../api/adminManage';
import { useCaseList } from '../../hooks/useCaseList';
import { dateOnly, dateTime, money, tourDay } from '../../lib/format';
import { PAYOUT_STAGES } from '../../lib/payoutStage';
import ConfirmDialog from '../../ui/ConfirmDialog';
import type { Column } from '../../ui/DataTable';
import Facts from '../../ui/Facts';
import FilterChips from '../../ui/FilterChips';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';
import CaseTable from './CaseTable';

export default function AdminPayoutsPage() {
  const toast = useToast();
  const [target, setTarget] = useState<AdminPayout | null>(null);
  const { filter, setFilter, page, setPage, list } = useCaseList(
    (status: 'PENDING' | 'PAID', current) => listPayouts(status, current),
    'PENDING',
  );
  const columns = useMemo<Column<AdminPayout>[]>(
    () => [
      {
        key: 'code',
        header: 'Reserva',
        nowrap: true,
        render: (row) => row.bookingCode,
      },
      {
        key: 'provider',
        header: 'Proveedor',
        render: (row) => row.providerName ?? 'Sin proveedor',
      },
      {
        key: 'date',
        header: 'Tour',
        nowrap: true,
        render: (row) => tourDay(row.tourDate),
      },
      {
        key: 'net',
        header: 'A pagar',
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
      {
        key: 'action',
        header: 'Acción',
        align: 'right',
        render: (row) =>
          row.stage === 'READY' ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setTarget(row)}
            >
              Pagar
            </button>
          ) : null,
      },
    ],
    [],
  );
  return (
    <div className="page-stack">
      <PageHeader
        title="Liquidaciones"
        intro="Paga a guías y agencias cuando termine el plazo de reclamos."
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
        caption="Liquidaciones a proveedores"
        columns={columns}
        list={list}
        page={page}
        onPage={setPage}
        emptyTitle="No hay liquidaciones en este estado."
      />
      {target && (
        <ConfirmDialog
          title="Marcar como pagada"
          confirmLabel="Confirmar pago"
          onClose={() => setTarget(null)}
          onConfirm={async () => {
            await markPayoutPaid(target.id);
            await list.reload();
            toast('Liquidación marcada como pagada.');
          }}
        >
          <Facts
            items={[
              { label: 'Reserva', value: target.bookingCode },
              {
                label: 'Proveedor',
                value: target.providerName ?? 'Sin proveedor',
              },
              { label: 'Bruto', value: money(target.grossAmount) },
              {
                label: `Comisión (${target.commissionRate} %)`,
                value: money(target.commissionAmount),
              },
              {
                label: 'Multas y descuentos',
                value: money(target.penaltyDeduction),
              },
              { label: 'A pagar', value: money(target.netAmount) },
              { label: 'Generada', value: dateTime(target.createdAt) },
            ]}
          />
          <p className="notice">
            Confirma solo si ya hiciste la transferencia. Esta acción no se
            puede deshacer.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
