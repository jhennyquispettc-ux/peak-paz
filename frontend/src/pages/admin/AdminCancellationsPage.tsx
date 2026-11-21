import { Download } from 'lucide-react';
import { useState } from 'react';
import {
  getCancellation,
  listCancellations,
  providerName,
  resolveCancellation,
  sanctionNote,
  type CancellationDecision,
  type CancellationReview,
  type ReviewStatus,
} from '../../api/adminCases';
import { downloadDocument } from '../../api/verification';
import { useAction } from '../../hooks/useAction';
import { useCaseList } from '../../hooks/useCaseList';
import { useResource } from '../../hooks/useResource';
import { dateTime, money, noticeTime, tourDay } from '../../lib/format';
import ChoiceGroup from '../../ui/ChoiceGroup';
import type { Column } from '../../ui/DataTable';
import ErrorState from '../../ui/ErrorState';
import Facts from '../../ui/Facts';
import FilterChips from '../../ui/FilterChips';
import LoadingState from '../../ui/LoadingState';
import Modal from '../../ui/Modal';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';
import CaseTable from './CaseTable';

const DECISION_LABELS: Record<CancellationDecision, string> = {
  NO_SANCTION: 'Sin sanción',
  STRIKE: 'Strike',
  STRIKE_AND_FINE: 'Strike y multa',
};

const COLUMNS: Column<CancellationReview>[] = [
  {
    key: 'code',
    header: 'Caso',
    render: (row) => row.bookingCode ?? 'Salida grupal',
  },
  { key: 'provider', header: 'Proveedor', render: providerName },
  { key: 'route', header: 'Ruta', render: (row) => row.routeNameEs ?? '' },
  {
    key: 'date',
    nowrap: true,
    header: 'Tour',
    render: (row) => tourDay(row.tourDate, row.startTime),
  },
  {
    key: 'notice',
    header: 'Anticipación',
    render: (row) => noticeTime(row.hoursBeforeStart),
  },
  {
    key: 'evidence',
    header: 'Justificante',
    render: (row) => (row.hasEvidence ? 'Adjunto' : 'No'),
  },
  {
    key: 'status',
    header: 'Estado',
    render: (row) =>
      row.decision ? (
        <StatusBadge tone="muted">{DECISION_LABELS[row.decision]}</StatusBadge>
      ) : (
        <StatusBadge tone="warning">Por revisar</StatusBadge>
      ),
  },
];

function CancellationModal({
  id,
  onClose,
  onResolved,
}: {
  id: string;
  onClose: () => void;
  onResolved: (message: string) => Promise<void>;
}) {
  const detail = useResource(() => getCancellation(id), [id]);
  const [decision, setDecision] = useState<CancellationDecision | null>(null);
  const [finePercent, setFinePercent] = useState('20');
  const [resolution, setResolution] = useState('');
  const { busy, error, run } = useAction();
  const review = detail.data;
  const percent = Number(finePercent);
  const validFine =
    decision !== 'STRIKE_AND_FINE' ||
    (Number.isInteger(percent) && percent >= 1 && percent <= 100);
  const canSubmit =
    Boolean(decision) && validFine && resolution.trim().length >= 5 && !busy;

  const submit = () =>
    run(async () => {
      if (!decision) return;
      const outcome = await resolveCancellation(id, {
        decision,
        resolution: resolution.trim(),
        ...(decision === 'STRIKE_AND_FINE' ? { finePercent: percent } : {}),
      });
      await onResolved(`Decisión registrada.${sanctionNote(outcome)}`);
    });

  return (
    <Modal
      title={`Cancelación ${review?.bookingCode ?? ''}`.trim()}
      onClose={onClose}
      footer={
        review?.status === 'PENDING' ? (
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
      {detail.error && <ErrorState message={detail.error} />}
      {!review && !detail.error && <LoadingState />}
      {review && (
        <>
          <Facts
            items={[
              { label: 'Proveedor', value: providerName(review) },
              { label: 'Ruta', value: review.routeNameEs ?? '' },
              {
                label: 'Tour',
                value: tourDay(review.tourDate, review.startTime),
              },
              { label: 'Canceló', value: dateTime(review.cancelledAt) },
              {
                label: 'Anticipación',
                value: noticeTime(review.hoursBeforeStart),
              },
              { label: 'Monto base', value: money(review.fineBaseAmount) },
              { label: 'Strikes activos', value: review.activeStrikes },
            ]}
          />
          <div>
            <p className="small muted">Motivo del proveedor</p>
            <p>{review.cancellationReason ?? 'No indicó un motivo.'}</p>
          </div>
          {review.hasEvidence && (
            <button
              type="button"
              className="btn btn-sm btn-ghost align-start"
              onClick={() =>
                void run(() =>
                  downloadDocument(
                    `/admin/cancellation-reviews/${review.id}/evidence`,
                  ),
                )
              }
            >
              <Download aria-hidden="true" />
              Ver justificante
            </button>
          )}
          {review.status === 'RESOLVED' ? (
            <Facts
              items={[
                {
                  label: 'Decisión',
                  value: review.decision
                    ? DECISION_LABELS[review.decision]
                    : '',
                },
                { label: 'Multa', value: money(review.fineAmount) },
                { label: 'Ya descontado', value: money(review.fineSettled) },
                { label: 'Resuelta', value: dateTime(review.resolvedAt) },
                { label: 'Fundamento', value: review.resolution ?? '' },
              ]}
            />
          ) : (
            <>
              <ChoiceGroup
                legend="Decisión"
                name="cancellation-decision"
                value={decision}
                onChange={setDecision}
                options={[
                  {
                    value: 'NO_SANCTION',
                    label: 'Sin sanción',
                    hint: 'El motivo es válido.',
                  },
                  {
                    value: 'STRIKE',
                    label: 'Strike',
                    hint: 'Suma un strike al proveedor.',
                  },
                  {
                    value: 'STRIKE_AND_FINE',
                    label: 'Strike y multa',
                    hint: 'La multa se descuenta de su próxima liquidación.',
                  },
                ]}
              />
              {decision === 'STRIKE_AND_FINE' && (
                <div className="field">
                  <label htmlFor="finePercent">Multa, en porcentaje</label>
                  <input
                    id="finePercent"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={finePercent}
                    onChange={(event) => setFinePercent(event.target.value)}
                  />
                  {validFine && (
                    <span className="field-hint">
                      Equivale a{' '}
                      {money((review.fineBaseAmount * percent) / 100)}
                    </span>
                  )}
                </div>
              )}
              <div className="field">
                <label htmlFor="cancellationResolution">Fundamento</label>
                <textarea
                  id="cancellationResolution"
                  rows={3}
                  maxLength={1000}
                  value={resolution}
                  placeholder="Explica por qué tomas esta decisión"
                  onChange={(event) => setResolution(event.target.value)}
                />
              </div>
            </>
          )}
          {error && <ErrorState message={error} />}
        </>
      )}
    </Modal>
  );
}

export default function AdminCancellationsPage() {
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const { filter, setFilter, page, setPage, list } = useCaseList(
    (status: ReviewStatus, current) => listCancellations(status, current),
    'PENDING',
  );
  return (
    <div className="page-stack">
      <PageHeader
        title="Cancelaciones"
        intro="Revisa el motivo de cada proveedor y decide si corresponde una sanción."
      />
      <FilterChips
        label="Estado"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'PENDING', label: 'Por revisar' },
          { value: 'RESOLVED', label: 'Resueltas' },
        ]}
      />
      <CaseTable
        caption="Cancelaciones de proveedores"
        columns={COLUMNS}
        list={list}
        page={page}
        onPage={setPage}
        onOpen={(row) => setOpenId(row.id)}
        emptyTitle="No hay cancelaciones en este estado."
      />
      {openId && (
        <CancellationModal
          id={openId}
          onClose={() => setOpenId(null)}
          onResolved={async (message) => {
            setOpenId(null);
            await list.reload();
            toast(message);
          }}
        />
      )}
    </div>
  );
}
