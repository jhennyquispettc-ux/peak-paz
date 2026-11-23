import { useState } from 'react';
import {
  AGENCY_DOCUMENTS,
  decideAgency,
  getAgency,
  listAgencies,
  type AgencyDetail,
  type VerificationFilter,
} from '../../api/adminCases';
import type { ApprovalState } from '../../api/interviews';
import { downloadDocument, REVIEW_LABELS } from '../../api/verification';
import { useAction } from '../../hooks/useAction';
import { useCaseList } from '../../hooks/useCaseList';
import ErrorState from '../../ui/ErrorState';
import Facts from '../../ui/Facts';
import FilterChips from '../../ui/FilterChips';
import InterviewPanel from '../../ui/InterviewPanel';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import DocumentAnalysis from '../../ui/DocumentAnalysis';
import Pagination from '../../ui/Pagination';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';

const FILTERS: { value: VerificationFilter; label: string }[] = [
  { value: 'PENDING', label: 'Pendiente de revisión' },
  { value: 'APPROVED', label: 'Aprobado' },
  { value: 'REJECTED', label: 'Requiere correcciones' },
];

export default function AgencyReviewPanel() {
  const toast = useToast();
  const { filter, setFilter, page, setPage, list } = useCaseList(
    (status: VerificationFilter, current) => listAgencies(status, current),
    'PENDING',
  );
  const [agency, setAgency] = useState<AgencyDetail | null>(null);
  const [reason, setReason] = useState('');
  const [approval, setApproval] = useState<ApprovalState | null>(null);
  const { busy, error, run } = useAction();

  const select = (id: string) =>
    run(async () => {
      setAgency(null);
      setReason('');
      setAgency(await getAgency(id));
    });

  const decide = (status: 'APPROVED' | 'REJECTED') =>
    run(async () => {
      if (!agency) return;
      await decideAgency(agency.id, status, reason.trim());
      setAgency(null);
      setReason('');
      await list.reload();
      toast(
        status === 'APPROVED'
          ? 'Agencia aprobada. La decisión quedó registrada.'
          : 'Agencia rechazada. El motivo está disponible en su cuenta.',
      );
    });

  return (
    <div className="page-stack">
      <PageHeader
        title="Revisión de agencias"
        intro="Contrasta los datos legales y los documentos de la agencia antes de aprobarla."
      />
      {error && <ErrorState message={error} />}
      {list.error && (
        <ErrorState message={list.error} onRetry={() => void list.reload()} />
      )}
      <FilterChips
        label="Estado de revisión"
        options={FILTERS}
        value={filter}
        onChange={(next) => {
          setAgency(null);
          setFilter(next);
        }}
      />
      <div className="admin-review-grid">
        <aside className="review-list">
          <h2 className="h3">Agencias</h2>
          {list.loading && !list.data && <LoadingState />}
          {list.data?.data.length === 0 && (
            <p className="notice">No hay agencias en este estado.</p>
          )}
          {list.data?.data.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`review-person ${agency?.id === item.id ? 'selected' : ''}`}
              disabled={busy}
              onClick={() => void select(item.id)}
            >
              <strong>{item.legalName}</strong>
              <span>{item.email}</span>
            </button>
          ))}
          {list.data && (
            <Pagination
              page={page}
              totalPages={list.data.meta.totalPages}
              onChange={setPage}
            />
          )}
        </aside>
        <section className="verification-section card">
          {!agency ? (
            <p role="status" className="muted">
              {busy
                ? 'Cargando el expediente…'
                : 'Selecciona una agencia para revisar su expediente.'}
            </p>
          ) : (
            <>
              <h2 className="h2">{agency.legalName}</h2>
              <span>
                <StatusBadge tone="info">
                  {REVIEW_LABELS[agency.verificationStatus]}
                </StatusBadge>
              </span>
              <Facts
                items={[
                  { label: 'NIT', value: agency.taxId },
                  { label: 'Dirección', value: agency.address },
                  {
                    label: 'Representante',
                    value: `${agency.user.firstName} ${agency.user.lastName}`,
                  },
                  { label: 'Correo', value: agency.user.email },
                ]}
              />
              {agency.rejectionReason && (
                <p className="notice">
                  Último motivo: {agency.rejectionReason}
                </p>
              )}
              <DocumentAnalysis
                key={agency.id}
                subject="AGENCY"
                subjectId={agency.id}
                labels={AGENCY_DOCUMENTS}
                complete={agency.missingDocuments.length === 0}
              />
              <InterviewPanel
                key={`interview-${agency.id}`}
                subject="AGENCY"
                subjectId={agency.id}
                onApproval={setApproval}
              />
              {AGENCY_DOCUMENTS.map((document) => {
                const file = agency.documents.find(
                  (item) => item.type === document.type,
                );
                const missing = agency.missingDocuments.includes(document.type);
                return (
                  <div className="credential-row" key={document.type}>
                    <div className="credential-heading">
                      <strong>{document.label}</strong>
                      <StatusBadge tone={missing ? 'warning' : 'success'}>
                        {missing ? 'Falta o está vencido' : 'Disponible'}
                      </StatusBadge>
                    </div>
                    {file && (
                      <div className="verification-actions">
                        <span className="small muted">
                          {file.expiresAt
                            ? `Vence: ${file.expiresAt}`
                            : 'Sin vencimiento declarado'}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            void run(() =>
                              downloadDocument(
                                `/admin/agencies/${agency.id}/documents/${file.id}/file`,
                              ),
                            )
                          }
                        >
                          Descargar para revisar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {agency.verificationStatus === 'PENDING' && (
                <>
                  <div className="field">
                    <label htmlFor="agencyRejection">
                      Motivo, obligatorio para rechazar
                    </label>
                    <textarea
                      id="agencyRejection"
                      value={reason}
                      maxLength={500}
                      rows={3}
                      placeholder="Explica qué debe corregir la agencia"
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </div>
                  <div className="verification-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={
                        busy ||
                        agency.missingDocuments.length > 0 ||
                        !approval?.canApprove
                      }
                      onClick={() => void decide('APPROVED')}
                    >
                      Aprobar agencia
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy || reason.trim().length < 5}
                      onClick={() => void decide('REJECTED')}
                    >
                      Rechazar con motivo
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
