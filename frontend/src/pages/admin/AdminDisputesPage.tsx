import { useState } from 'react';
import {
  listDisputes,
  resolveDispute,
  sanctionNote,
  type Dispute,
  type DisputeDecision,
  type DisputeStatus,
} from '../../api/adminCases';
import { useAction } from '../../hooks/useAction';
import { useCaseList } from '../../hooks/useCaseList';
import { dateTime, tourDay } from '../../lib/format';
import ChoiceGroup from '../../ui/ChoiceGroup';
import type { Column } from '../../ui/DataTable';
import ErrorState from '../../ui/ErrorState';
import Facts from '../../ui/Facts';
import FilterChips from '../../ui/FilterChips';
import Modal from '../../ui/Modal';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';
import CaseTable from './CaseTable';

const REASONS: Record<Dispute['reason'], string> = {
  GUIDE_NO_SHOW: 'Guía no se presentó',
  START_MISMATCH: 'Inicio sin confirmar',
};

const DECISIONS: Record<DisputeDecision, string> = {
  TOUR_HAPPENED: 'El tour se realizó',
  GUIDE_NO_SHOW: 'El guía no se presentó',
};

const COLUMNS: Column<Dispute>[] = [
  { key: 'code', header: 'Reserva', render: (row) => row.bookingCode },
  { key: 'reason', header: 'Motivo', render: (row) => REASONS[row.reason] },
  { key: 'guide', header: 'Guía', render: (row) => row.guideName ?? '' },
  { key: 'tourist', header: 'Turista', render: (row) => row.touristName ?? '' },
  {
    key: 'date',
    nowrap: true,
    header: 'Tour',
    render: (row) => tourDay(row.tourDate, row.startTime),
  },
  {
    key: 'status',
    header: 'Estado',
    render: (row) =>
      row.decision ? (
        <StatusBadge tone="muted">{DECISIONS[row.decision]}</StatusBadge>
      ) : (
        <StatusBadge tone="warning">Abierta</StatusBadge>
      ),
  },
];

function DisputeModal({
  dispute,
  onClose,
  onResolved,
}: {
  dispute: Dispute;
  onClose: () => void;
  onResolved: (message: string) => Promise<void>;
}) {
  const [decision, setDecision] = useState<DisputeDecision | null>(null);
  const [resolution, setResolution] = useState('');
  const { busy, error, run } = useAction();
  const isOpen = dispute.status === 'OPEN';
  const canSubmit = Boolean(decision) && resolution.trim().length >= 5 && !busy;

  const submit = () =>
    run(async () => {
      if (!decision) return;
      const outcome = await resolveDispute(dispute.id, {
        decision,
        resolution: resolution.trim(),
      });
      await onResolved(`Disputa resuelta.${sanctionNote(outcome)}`);
    });

  return (
    <Modal
      title={`Disputa ${dispute.bookingCode}`}
      onClose={onClose}
      footer={
        isOpen ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Volver
            </button>
            <button
              type="button"
              className={`btn ${decision === 'GUIDE_NO_SHOW' ? 'btn-danger' : 'btn-primary'}`}
              disabled={!canSubmit}
              onClick={() => void submit()}
            >
              Resolver disputa
            </button>
          </>
        ) : undefined
      }
    >
      <Facts
        items={[
          { label: 'Motivo', value: REASONS[dispute.reason] },
          {
            label: 'Abierta por',
            value: dispute.openedBy === 'TOURIST' ? 'Turista' : 'Sistema',
          },
          { label: 'Ruta', value: dispute.routeNameEs ?? '' },
          {
            label: 'Tour',
            value: tourDay(dispute.tourDate, dispute.startTime),
          },
          { label: 'Guía', value: dispute.guideName ?? '' },
          { label: 'Turista', value: dispute.touristName ?? '' },
          { label: 'Reconfirmó', value: dateTime(dispute.reconfirmedAt) },
          { label: 'Inicio del guía', value: dateTime(dispute.guideStartedAt) },
          {
            label: 'Inicio del turista',
            value: dateTime(dispute.touristStartedAt),
          },
          {
            label: 'Distancia al punto',
            value:
              dispute.guideStartDistanceM === null
                ? 'Sin ubicación'
                : `${dispute.guideStartDistanceM} m`,
          },
        ]}
      />
      {dispute.description && (
        <div>
          <p className="small muted">Relato</p>
          <p>{dispute.description}</p>
        </div>
      )}
      {isOpen ? (
        <>
          <ChoiceGroup
            legend="Decisión"
            name="dispute-decision"
            value={decision}
            onChange={setDecision}
            options={[
              {
                value: 'TOUR_HAPPENED',
                label: DECISIONS.TOUR_HAPPENED,
                hint: 'Se completa el tour y se genera el pago al guía.',
              },
              {
                value: 'GUIDE_NO_SHOW',
                label: DECISIONS.GUIDE_NO_SHOW,
                hint: 'Se reembolsa al turista y el guía recibe un strike grave.',
              },
            ]}
          />
          <div className="field">
            <label htmlFor="disputeResolution">Fundamento</label>
            <textarea
              id="disputeResolution"
              rows={3}
              maxLength={1000}
              value={resolution}
              placeholder="Explica en qué te basas"
              onChange={(event) => setResolution(event.target.value)}
            />
          </div>
        </>
      ) : (
        <Facts
          items={[
            {
              label: 'Decisión',
              value: dispute.decision ? DECISIONS[dispute.decision] : '',
            },
            { label: 'Resuelta', value: dateTime(dispute.resolvedAt) },
            { label: 'Fundamento', value: dispute.resolution ?? '' },
          ]}
        />
      )}
      {error && <ErrorState message={error} />}
    </Modal>
  );
}

export default function AdminDisputesPage() {
  const toast = useToast();
  const [open, setOpen] = useState<Dispute | null>(null);
  const { filter, setFilter, page, setPage, list } = useCaseList(
    (status: DisputeStatus, current) => listDisputes(status, current),
    'OPEN',
  );
  return (
    <div className="page-stack">
      <PageHeader
        title="Disputas"
        intro="Compara lo que registraron el guía y el turista antes de decidir."
      />
      <FilterChips
        label="Estado"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'OPEN', label: 'Abiertas' },
          { value: 'RESOLVED', label: 'Resueltas' },
        ]}
      />
      <CaseTable
        caption="Disputas de tours"
        columns={COLUMNS}
        list={list}
        page={page}
        onPage={setPage}
        onOpen={setOpen}
        emptyTitle="No hay disputas en este estado."
      />
      {open && (
        <DisputeModal
          dispute={open}
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
