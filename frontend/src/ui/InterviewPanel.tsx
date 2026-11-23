import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { ReviewSubject } from '../api/adminCases';
import {
  INTERVIEW_STATUS_LABELS,
  MODALITY_LABELS,
  cancelInterview,
  getInterviews,
  recordInterview,
  scheduleInterview,
  type ApprovalState,
  type CredentialType,
  type InterviewModality,
  type InterviewOverview,
} from '../api/interviews';

const formatDate = (value: string) =>
  new Date(value).toLocaleString('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

interface Props {
  subject: ReviewSubject;
  subjectId: string;
  onApproval: (state: ApprovalState | null) => void;
}

export default function InterviewPanel({
  subject,
  subjectId,
  onApproval,
}: Props) {
  const [overview, setOverview] = useState<InterviewOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [modality, setModality] = useState<InterviewModality>('IN_PERSON');
  const [location, setLocation] = useState('');
  const [result, setResult] = useState<'PASSED' | 'FAILED'>('PASSED');
  const [notes, setNotes] = useState('');
  const [premisesVisited, setPremisesVisited] = useState(false);
  const [credential, setCredential] = useState<CredentialType | ''>('');

  const load = useCallback(async () => {
    const next = await getInterviews(subject, subjectId);
    setOverview(next);
    setCredential(next.credentialType ?? '');
    onApproval(next.approval);
  }, [subject, subjectId, onApproval]);

  useEffect(() => {
    onApproval(null);
    void load().catch((caught) => setError((caught as Error).message));
  }, [load, onApproval]);

  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
      return true;
    } catch (caught) {
      setError((caught as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitSchedule(event: FormEvent) {
    event.preventDefault();
    const done = await act(() =>
      scheduleInterview(subject, subjectId, {
        scheduledAt: new Date(scheduledAt).toISOString(),
        modality,
        location: location.trim(),
      }),
    );
    if (done) {
      setScheduledAt('');
      setLocation('');
    }
  }

  const open = overview?.interviews.find((item) => item.status === 'SCHEDULED');

  async function submitResult(event: FormEvent) {
    event.preventDefault();
    if (!open) return;
    const done = await act(() =>
      recordInterview(open.id, {
        result,
        notes: notes.trim(),
        ...(subject === 'AGENCY' ? { premisesVisited } : {}),
        ...(subject === 'GUIDE' && credential
          ? { credentialType: credential }
          : {}),
      }),
    );
    if (done) {
      setNotes('');
      setPremisesVisited(false);
      setResult('PASSED');
    }
  }

  const needsCredential =
    subject === 'GUIDE' && result === 'PASSED' && !credential;
  const needsVisit =
    subject === 'AGENCY' && result === 'PASSED' && !premisesVisited;

  return (
    <div className="credential-row">
      <div className="credential-heading">
        <strong>Entrevista</strong>
        {overview && (
          <span
            className={`badge ${overview.approval.canApprove ? 'badge-success' : 'badge-warning'}`}
          >
            {overview.approval.canApprove ? 'Lista para decidir' : 'Pendiente'}
          </span>
        )}
      </div>
      {overview?.approval.message && (
        <p className="small muted">{overview.approval.message}</p>
      )}
      {error && (
        <p role="alert" className="notice notice-danger">
          {error}
        </p>
      )}
      {open ? (
        <form className="form-stack" onSubmit={submitResult}>
          <p className="small">
            {MODALITY_LABELS[open.modality]}, {formatDate(open.scheduledAt)}.
            <br />
            {open.location}
          </p>
          <div className="field">
            <label htmlFor="interviewResult">Resultado</label>
            <select
              id="interviewResult"
              value={result}
              onChange={(event) =>
                setResult(event.target.value as 'PASSED' | 'FAILED')
              }
            >
              <option value="PASSED">Satisfactoria</option>
              <option value="FAILED">No satisfactoria</option>
            </select>
          </div>
          {subject === 'GUIDE' && (
            <div className="field">
              <label htmlFor="interviewCredential">Credencial verificada</label>
              <select
                id="interviewCredential"
                value={credential}
                onChange={(event) =>
                  setCredential(event.target.value as CredentialType | '')
                }
              >
                <option value="">Selecciona</option>
                <option value="SIRETUR">SIRETUR</option>
                <option value="FEBOGUIT">FEBOGUIT</option>
              </select>
            </div>
          )}
          {subject === 'AGENCY' && (
            <label className="small">
              <input
                type="checkbox"
                checked={premisesVisited}
                onChange={(event) => setPremisesVisited(event.target.checked)}
              />{' '}
              Verifiqué el local de la agencia
            </label>
          )}
          <div className="field">
            <label htmlFor="interviewNotes">Notas de la entrevista</label>
            <textarea
              id="interviewNotes"
              value={notes}
              rows={3}
              minLength={5}
              maxLength={1000}
              required
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="verification-actions">
            <button
              className="btn btn-secondary btn-sm"
              disabled={
                busy || notes.trim().length < 5 || needsCredential || needsVisit
              }
            >
              Registrar resultado
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => void act(() => cancelInterview(open.id))}
            >
              Cancelar entrevista
            </button>
          </div>
        </form>
      ) : (
        <form className="form-stack" onSubmit={submitSchedule}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="interviewDate">Fecha y hora</label>
              <input
                id="interviewDate"
                type="datetime-local"
                value={scheduledAt}
                required
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="interviewModality">Modalidad</label>
              <select
                id="interviewModality"
                value={modality}
                onChange={(event) =>
                  setModality(event.target.value as InterviewModality)
                }
              >
                <option value="IN_PERSON">Presencial</option>
                <option value="VIRTUAL">Virtual</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="interviewLocation">
              {modality === 'VIRTUAL' ? 'Enlace https de la reunión' : 'Lugar'}
            </label>
            <input
              id="interviewLocation"
              type={modality === 'VIRTUAL' ? 'url' : 'text'}
              value={location}
              minLength={5}
              maxLength={300}
              required
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
          <button
            className="btn btn-secondary btn-sm align-start"
            disabled={busy || !scheduledAt || location.trim().length < 5}
          >
            Agendar y avisar
          </button>
        </form>
      )}
      {overview &&
        overview.interviews.some((item) => item.status !== 'SCHEDULED') && (
          <ul className="review-history">
            {overview.interviews
              .filter((item) => item.status !== 'SCHEDULED')
              .map((item) => (
                <li key={item.id}>
                  <strong>{INTERVIEW_STATUS_LABELS[item.status]}</strong>
                  <span className="small muted">
                    {MODALITY_LABELS[item.modality]},{' '}
                    {formatDate(item.scheduledAt)}
                    {item.premisesVisited ? ', local verificado' : ''}
                  </span>
                  {item.notes && <p className="small">{item.notes}</p>}
                </li>
              ))}
          </ul>
        )}
    </div>
  );
}
