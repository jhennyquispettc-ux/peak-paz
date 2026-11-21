import { Download, Upload } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AGENCY_DOCUMENTS } from '../../api/adminCases';
import {
  getAgencyMe,
  requestAgencyReview,
  updateAgencyMe,
  uploadAgencyDocument,
  type AgencyMe,
} from '../../api/agency';
import { downloadDocument, REVIEW_LABELS } from '../../api/verification';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../hooks/useResource';
import ErrorState from '../../ui/ErrorState';
import { Field } from '../../ui/Field';
import LoadingState from '../../ui/LoadingState';
import PageHeader from '../../ui/PageHeader';
import StatusBadge from '../../ui/StatusBadge';
import { useToast } from '../../ui/Toast';
import AgencyStatusNotice from './AgencyStatusNotice';

function DataForm({
  agency,
  onSaved,
}: {
  agency: AgencyMe;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const locked = agency.verificationStatus === 'APPROVED';
  const [form, setForm] = useState({
    legalName: agency.legalName,
    taxId: agency.taxId,
    operatorLicense: agency.operatorLicense,
    association: agency.association,
    address: agency.address,
    descriptionEs: agency.descriptionEs ?? '',
    descriptionEn: agency.descriptionEn ?? '',
  });
  const { busy, error, run } = useAction();
  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (value: string) =>
      setForm((current) => ({ ...current, [key]: value })),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await updateAgencyMe({
        ...(locked
          ? {}
          : {
              legalName: form.legalName.trim(),
              taxId: form.taxId.trim(),
              operatorLicense: form.operatorLicense.trim(),
              association: form.association.trim(),
            }),
        address: form.address.trim(),
        ...(form.descriptionEs.trim()
          ? { descriptionEs: form.descriptionEs.trim() }
          : {}),
        ...(form.descriptionEn.trim()
          ? { descriptionEn: form.descriptionEn.trim() }
          : {}),
      });
      await onSaved();
      toast('Datos guardados.');
    });
  }
  return (
    <form className="card form-stack" onSubmit={submit}>
      <h2 className="h3">Datos de la agencia</h2>
      {locked ? (
        <div className="form-grid">
          <p>
            <span className="small muted">Razón social</span>
            <br />
            {agency.legalName}
          </p>
          <p>
            <span className="small muted">NIT</span>
            <br />
            {agency.taxId}
          </p>
          <p>
            <span className="small muted">Licencia de operador</span>
            <br />
            {agency.operatorLicense}
          </p>
          <p>
            <span className="small muted">Asociación</span>
            <br />
            {agency.association}
          </p>
        </div>
      ) : (
        <div className="form-grid">
          <Field label="Razón social" required {...bind('legalName')} />
          <Field label="NIT" required {...bind('taxId')} />
          <Field
            label="Licencia de operador"
            required
            {...bind('operatorLicense')}
          />
          <Field label="Asociación" required {...bind('association')} />
        </div>
      )}
      {locked && (
        <p className="small muted">
          Los datos legales quedan bloqueados después de la aprobación.
        </p>
      )}
      <Field label="Dirección" required {...bind('address')} />
      <div className="form-grid">
        <Field
          label="Presentación en español"
          rows={4}
          maxLength={2000}
          {...bind('descriptionEs')}
        />
        <Field
          label="Presentación en inglés"
          rows={4}
          maxLength={2000}
          {...bind('descriptionEn')}
        />
      </div>
      {error && <ErrorState message={error} />}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Guardar datos
        </button>
      </div>
    </form>
  );
}

function DocumentRow({
  agency,
  type,
  label,
  onSaved,
}: {
  agency: AgencyMe;
  type: string;
  label: string;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const file = agency.documents.find((item) => item.type === type);
  const missing = agency.missingDocuments.includes(type);
  const [selected, setSelected] = useState<File | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const { busy, error, run } = useAction();
  const inputId = `document-${type}`;
  return (
    <div className="credential-row">
      <div className="credential-heading">
        <strong>{label}</strong>
        <StatusBadge tone={missing ? 'warning' : 'success'}>
          {missing ? 'Falta o está vencido' : 'Vigente'}
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
                downloadDocument(`/agencies/me/documents/${file.id}/file`),
              )
            }
          >
            <Download aria-hidden="true" />
            Descargar
          </button>
        </div>
      )}
      <div className="form-grid">
        <div className="field">
          <label htmlFor={inputId}>
            {file ? 'Reemplazar archivo' : 'Archivo'}
          </label>
          <input
            id={inputId}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(event) => setSelected(event.target.files?.[0] ?? null)}
          />
        </div>
        <Field
          label="Vencimiento, si tiene"
          type="date"
          value={expiresAt}
          onChange={setExpiresAt}
        />
      </div>
      {error && <ErrorState message={error} />}
      <button
        type="button"
        className="btn btn-secondary btn-sm align-start"
        disabled={!selected || busy}
        onClick={() =>
          void run(async () => {
            await uploadAgencyDocument(type, selected!, expiresAt);
            setSelected(null);
            setExpiresAt('');
            await onSaved();
            toast('Documento cargado.');
          })
        }
      >
        <Upload aria-hidden="true" />
        {busy ? 'Cargando…' : 'Cargar documento'}
      </button>
    </div>
  );
}

export default function AgencyProfilePage() {
  const toast = useToast();
  const profile = useResource(getAgencyMe, []);
  const { busy, error, run } = useAction();
  const agency = profile.data;
  return (
    <div className="page-stack">
      <PageHeader
        title="Perfil"
        intro="Los datos y documentos de tu agencia."
      />
      {profile.error && (
        <ErrorState
          message={profile.error}
          onRetry={() => void profile.reload()}
        />
      )}
      {!agency && !profile.error && <LoadingState />}
      {agency && (
        <>
          <span>
            <StatusBadge
              tone={
                agency.verificationStatus === 'APPROVED' ? 'success' : 'warning'
              }
            >
              {REVIEW_LABELS[agency.verificationStatus]}
            </StatusBadge>
          </span>
          <AgencyStatusNotice agency={agency} />
          {agency.verificationStatus === 'REJECTED' && (
            <div className="action-bar">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || agency.missingDocuments.length > 0}
                onClick={() =>
                  void run(async () => {
                    await requestAgencyReview();
                    await profile.reload();
                    toast('Enviamos tu agencia a una nueva revisión.');
                  })
                }
              >
                Pedir revisión
              </button>
            </div>
          )}
          {error && <ErrorState message={error} />}
          <DataForm
            key={agency.verificationStatus}
            agency={agency}
            onSaved={profile.reload}
          />
          <section className="card form-stack">
            <h2 className="h3">Documentos</h2>
            {AGENCY_DOCUMENTS.map((document) => (
              <DocumentRow
                key={document.type}
                agency={agency}
                type={document.type}
                label={document.label}
                onSaved={profile.reload}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
