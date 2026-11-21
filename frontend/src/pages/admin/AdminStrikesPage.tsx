import { useMemo, useState } from 'react';
import {
  listStrikes,
  providerName,
  revertStrike,
  type Strike,
  type StrikeReason,
  type StrikeStatus,
} from '../../api/adminCases';
import { useCaseList } from '../../hooks/useCaseList';
import { dateOnly, tourDay } from '../../lib/format';
import ConfirmDialog from '../../ui/ConfirmDialog';
import type { Column } from '../../ui/DataTable';
import FilterChips from '../../ui/FilterChips';
import PageHeader from '../../ui/PageHeader';
import { useToast } from '../../ui/Toast';
import CaseTable from './CaseTable';

const REASONS: Record<StrikeReason, string> = {
  CANCELLED_WITHOUT_WEATHER: 'Canceló sin motivo de clima',
  NO_SHOW: 'No se presentó',
  COMPLAINT: 'Reclamo aceptado',
};

export default function AdminStrikesPage() {
  const toast = useToast();
  const [target, setTarget] = useState<Strike | null>(null);
  const { filter, setFilter, page, setPage, list } = useCaseList(
    (status: StrikeStatus, current) => listStrikes(status, current),
    'ACTIVE',
  );
  const columns = useMemo<Column<Strike>[]>(
    () => [
      { key: 'provider', header: 'Proveedor', render: providerName },
      { key: 'reason', header: 'Motivo', render: (row) => REASONS[row.reason] },
      { key: 'weight', header: 'Peso', render: (row) => row.weight },
      {
        key: 'case',
        header: 'Caso',
        render: (row) => row.bookingCode ?? 'Salida grupal',
      },
      {
        key: 'date',
        nowrap: true,
        header: 'Tour',
        render: (row) => tourDay(row.tourDate),
      },
      {
        key: 'expires',
        header: 'Vence',
        nowrap: true,
        render: (row) => dateOnly(row.expiresAt),
      },
      {
        key: 'action',
        header: 'Acción',
        align: 'right',
        render: (row) =>
          row.status === 'ACTIVE' ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setTarget(row)}
            >
              Anular
            </button>
          ) : null,
      },
    ],
    [],
  );
  return (
    <div className="page-stack">
      <PageHeader
        title="Strikes"
        intro="Consulta las sanciones de guías y agencias, y anula las que correspondan."
      />
      <FilterChips
        label="Estado"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'ACTIVE', label: 'Activos' },
          { value: 'REVERTED', label: 'Anulados' },
          { value: 'EXPIRED', label: 'Vencidos' },
        ]}
      />
      <CaseTable
        caption="Strikes de proveedores"
        columns={columns}
        list={list}
        page={page}
        onPage={setPage}
        emptyTitle="No hay strikes en este estado."
      />
      {target && (
        <ConfirmDialog
          title="Anular strike"
          confirmLabel="Anular strike"
          destructive
          onClose={() => setTarget(null)}
          onConfirm={async () => {
            await revertStrike(target.id);
            await list.reload();
            toast('Strike anulado.');
          }}
        >
          <p>
            Vas a anular el strike de <strong>{providerName(target)}</strong>.
          </p>
          <p className="notice">
            Anularlo no levanta el ocultamiento ni la suspensión que ya se
            aplicaron.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
