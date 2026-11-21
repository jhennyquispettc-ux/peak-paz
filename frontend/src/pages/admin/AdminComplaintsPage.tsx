import { useState } from 'react';
import {
  listComplaints,
  providerName,
  resolveComplaint,
  sanctionNote,
  type Complaint,
  type ComplaintStatus,
} from '../../api/adminCases';
import { useAction } from '../../hooks/useAction';
import { useCaseList } from '../../hooks/useCaseList';
import { dateTime, money, tourDay } from '../../lib/format';
import ChoiceGroup from '../../ui/ChoiceGroup';
import type { Column } from '../../ui/DataTable';
import ErrorState from '../../ui/ErrorState';
import Facts from '../../ui/Facts';
import FilterChips from '../../ui/FilterChips';
import Modal from '../../ui/Modal';
import PageHeader from '../../ui/PageHeader';
import StatusBadge, { type StatusTone } from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';
import CaseTable from './CaseTable';

const STATUS: Record<ComplaintStatus, { label: string; tone: StatusTone }> = {
  OPEN: { label: 'Abierto', tone: 'warning' },
  ACCEPTED: { label: 'Aceptado', tone: 'success' },
  REJECTED: { label: 'Rechazado', tone: 'muted' },
};

const COLUMNS: Column<Complaint>[] = [
  { key: 'code', header: 'Reserva', render: (row) => row.bookingCode ?? '' },
  { key: 'tourist', header: 'Turista', render: (row) => row.touristName ?? '' },
  { key: 'provider', header: 'Proveedor', render: providerName },
  { key: 'route', header: 'Ruta', render: (row) => row.routeNameEs ?? '' },
  {
    key: 'date',
    nowrap: true,
    header: 'Recibido',
    render: (row) => dateTime(row.createdAt),
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

function ComplaintModal({
  complaint,
  onClose,
  onResolved,
}: {
  complaint: Complaint;
  onClose: () => void;
  onResolved: (message: string) => Promise<void>;
}) {
  const [decision, setDecision] = useState<'ACCEPTED' | 'REJECTED' | null>(
    null,
  );
  const [refundPercent, setRefundPercent] = useState('50');
  const [strike, setStrike] = useState(false);
  const [resolution, setResolution] = useState('');
  const { busy, error, run } = useAction();
  const isOpen = complaint.status === 'OPEN';
  const percent = Number(refundPercent);
  const validPercent =
    refundPercent.trim() !== '' &&
    Number.isInteger(percent) &&
    percent >= 0 &&
    percent <= 100;
  const canSubmit =
    Boolean(decision) &&
    (decision === 'REJECTED' || validPercent) &&
    resolution.trim().length >= 5 &&
    !busy;

  const submit = () =>
    run(async () => {
      if (!decision) return;
      const outcome = await resolveComplaint(complaint.id, {
        decision,
        resolution: resolution.trim(),
        ...(decision === 'ACCEPTED' ? { refundPercent: percent, strike } : {}),
      });
      await onResolved(`Reclamo resuelto.${sanctionNote(outcome)}`);
    });

  return (
    <Modal
      title={`Reclamo ${complaint.bookingCode ?? ''}`.trim()}
      onClose={onClose}
      footer={
        isOpen ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Volver
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSubmit}
              onClick={() => void submit()}
            >
              Registrar decisión
            </button>
          </>
        ) : undefined
      }
    >
      <Facts
        items={[
          { label: 'Turista', value: complaint.touristName ?? '' },
          { label: 'Proveedor', value: providerName(complaint) },
          { label: 'Ruta', value: complaint.routeNameEs ?? '' },
          {
            label: 'Tour',
            value: tourDay(complaint.tourDate, complaint.startTime),
          },
          { label: 'Recibido', value: dateTime(complaint.createdAt) },
        ]}
      />
      <div>
        <p className="small muted">Relato del turista</p>
        <p>{complaint.description}</p>
      </div>
      {isOpen ? (
        <>
          <p className="notice">
            Mientras el reclamo siga abierto, el pago al proveedor queda
            retenido.
          </p>
          <ChoiceGroup
            legend="Decisión"
            name="complaint-decision"
            value={decision}
            onChange={setDecision}
            options={[
              {
                value: 'ACCEPTED',
                label: 'Aceptar',
                hint: 'Se devuelve un porcentaje y se descuenta al proveedor.',
              },
              {
                value: 'REJECTED',
                label: 'Rechazar',
                hint: 'Se libera el pago al proveedor.',
              },
            ]}
          />
          {decision === 'ACCEPTED' && (
            <>
              <div className="field">
                <label htmlFor="refundPercent">
                  Reembolso, en porcentaje de lo pagado
                </label>
                <input
                  id="refundPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={refundPercent}
                  onChange={(event) => setRefundPercent(event.target.value)}
                />
              </div>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={strike}
                  onChange={(event) => setStrike(event.target.checked)}
                />
                Dar un strike al proveedor
              </label>
            </>
          )}
          <div className="field">
            <label htmlFor="complaintResolution">Fundamento</label>
            <textarea
              id="complaintResolution"
              rows={3}
              maxLength={1000}
              value={resolution}
              placeholder="Explica por qué tomas esta decisión"
              onChange={(event) => setResolution(event.target.value)}
            />
          </div>
        </>
      ) : (
        <Facts
          items={[
            { label: 'Decisión', value: STATUS[complaint.status].label },
            {
              label: 'Reembolso',
              value:
                complaint.refundPercent === null
                  ? 'Sin reembolso'
                  : `${complaint.refundPercent} %`,
            },
            {
              label: 'Descuento al proveedor',
              value: money(complaint.deductionAmount),
            },
            { label: 'Resuelto', value: dateTime(complaint.resolvedAt) },
            { label: 'Fundamento', value: complaint.resolution ?? '' },
          ]}
        />
      )}
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

export default function AdminComplaintsPage() {
  const toast = useToast();
  const [open, setOpen] = useState<Complaint | null>(null);
  const { filter, setFilter, page, setPage, list } = useCaseList(
    (status: ComplaintStatus, current) => listComplaints(status, current),
    'OPEN',
  );
  return (
    <div className="page-stack">
      <PageHeader
        title="Reclamos"
        intro="Atiende lo que reportaron los turistas después de su tour."
      />
      <FilterChips
        label="Estado"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'OPEN', label: 'Abiertos' },
          { value: 'ACCEPTED', label: 'Aceptados' },
          { value: 'REJECTED', label: 'Rechazados' },
        ]}
      />
      <CaseTable
        caption="Reclamos de turistas"
        columns={COLUMNS}
        list={list}
        page={page}
        onPage={setPage}
        onOpen={setOpen}
        emptyTitle="No hay reclamos en este estado."
      />
      {open && (
        <ComplaintModal
          complaint={open}
          onClose={() => setOpen(null)}
          onResolved={async (message) => {
            setOpen(null);
            await list.reload();
            toast(message);
          }}
        />
      )}
    </div>
  );
}
