import { useMemo } from 'react';
import {
  decideGuideRoute,
  listGuideRoutes,
  type GuideRouteRequest,
} from '../../../api/adminManage';
import { useAction } from '../../../hooks/useAction';
import { useCaseList } from '../../../hooks/useCaseList';
import type { Column } from '../../../ui/DataTable';
import ErrorState from '../../../ui/ErrorState';
import FilterChips from '../../../ui/FilterChips';
import StatusBadge from '../../../ui/StatusBadge';
import { useToast } from '../../../ui/Toast';
import CaseTable from '../CaseTable';

const REVIEW = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
};

export default function GuideRouteRequestsPanel() {
  const toast = useToast();
  const { busy, error, run } = useAction();
  const { filter, setFilter, page, setPage, list } = useCaseList(
    (status: GuideRouteRequest['status'], current) =>
      listGuideRoutes(status, current),
    'PENDING',
  );
  const columns = useMemo<Column<GuideRouteRequest>[]>(() => {
    const decide = (row: GuideRouteRequest, status: 'APPROVED' | 'REJECTED') =>
      void run(async () => {
        await decideGuideRoute(row.id, status);
        await list.reload();
        toast(
          status === 'APPROVED' ? 'Ruta autorizada.' : 'Solicitud rechazada.',
        );
      });
    return [
      { key: 'guide', header: 'Guía', render: (row) => row.guideName },
      { key: 'route', header: 'Ruta', render: (row) => row.routeNameEs },
      {
        key: 'verification',
        header: 'Verificación del guía',
        render: (row) => (
          <StatusBadge
            tone={
              row.guideVerificationStatus === 'APPROVED' ? 'success' : 'warning'
            }
          >
            {REVIEW[row.guideVerificationStatus]}
          </StatusBadge>
        ),
      },
      {
        key: 'action',
        header: 'Acción',
        align: 'right',
        render: (row) =>
          row.status === 'PENDING' ? (
            <span className="row-actions">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={busy || row.guideVerificationStatus !== 'APPROVED'}
                onClick={() => decide(row, 'APPROVED')}
              >
                Autorizar
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                disabled={busy}
                onClick={() => decide(row, 'REJECTED')}
              >
                Rechazar
              </button>
            </span>
          ) : (
            REVIEW[row.status]
          ),
      },
    ];
  }, [busy, list, run, toast]);
  return (
    <div className="page-stack">
      <FilterChips
        label="Estado de la solicitud"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'PENDING', label: 'Pendientes' },
          { value: 'APPROVED', label: 'Autorizadas' },
          { value: 'REJECTED', label: 'Rechazadas' },
        ]}
      />
      {error && <ErrorState message={error} />}
      <CaseTable
        caption="Solicitudes de guías para rutas"
        columns={columns}
        list={list}
        page={page}
        onPage={setPage}
        emptyTitle="No hay solicitudes en este estado."
      />
    </div>
  );
}
