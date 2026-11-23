import { useCallback, useEffect, useState } from 'react';
import {
  getDocumentReview,
  requestDocumentReview,
  type DocumentReview,
  type ReviewSubject,
} from '../api/adminCases';

const ALERTS: Record<string, string> = {
  INVALID_FORMAT: 'El archivo no se pudo abrir como documento',
  LOW_RESOLUTION: 'La resolución es baja',
  BLURRY: 'La imagen se ve borrosa',
  UNREADABLE: 'El texto no se pudo leer',
  NAME_NOT_FOUND: 'No se encontró el nombre esperado',
  ISSUER_NOT_FOUND: 'No se encontró la mención a SIRETUR o FEBOGUIT',
};

const SUMMARY = {
  NO_ALERTS: {
    tone: 'badge-success',
    label: 'Sin alertas',
    text: 'La lectura automática no encontró diferencias.',
  },
  HAS_ALERTS: {
    tone: 'badge-warning',
    label: 'Con alertas',
    text: 'Revisa con atención los puntos señalados.',
  },
  MANUAL_REVIEW: {
    tone: 'badge-warning',
    label: 'Revisión manual',
    text: 'No se pudo leer todo. Revisa los documentos personalmente.',
  },
} as const;

interface Props {
  subject: ReviewSubject;
  subjectId: string;
  labels: readonly { type: string; label: string }[];
  complete: boolean;
}

export default function DocumentAnalysis({
  subject,
  subjectId,
  labels,
  complete,
}: Props) {
  const [review, setReview] = useState<DocumentReview | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await getDocumentReview(subject, subjectId);
      setReview(result.review);
      setError('');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoaded(true);
    }
  }, [subject, subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = review?.status === 'PENDING';
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(timer);
  }, [pending, load]);

  async function analyze() {
    setBusy(true);
    setError('');
    try {
      setReview(await requestDocumentReview(subject, subjectId));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const summary = review?.recommendation
    ? SUMMARY[review.recommendation]
    : null;
  const labelOf = (type: string) =>
    labels.find((item) => item.type === type)?.label ?? type;

  return (
    <div className="credential-row">
      <div className="credential-heading">
        <strong>Análisis automático</strong>
        {pending && <span className="badge badge-info">Analizando…</span>}
        {!pending && summary && (
          <span className={`badge ${summary.tone}`}>{summary.label}</span>
        )}
      </div>
      <p className="small muted">
        Es una ayuda para tu revisión. No prueba que el documento sea auténtico
        y la decisión final siempre es tuya.
      </p>
      {error && (
        <p role="alert" className="notice notice-danger">
          {error}
        </p>
      )}
      {loaded && !review && (
        <p className="small">Todavía no hay un análisis de estos documentos.</p>
      )}
      {!pending && review?.status === 'FAILED' && (
        <p className="small">
          El análisis no pudo completarse. Revisa los documentos personalmente o
          inténtalo de nuevo.
        </p>
      )}
      {!pending && review?.status === 'COMPLETED' && summary && (
        <>
          <p className="small">{summary.text}</p>
          <ul className="review-history">
            {review.documents.map((document) => (
              <li key={document.documentId}>
                <strong>{labelOf(document.type)}</strong>
                <span className="small muted">
                  {document.readable
                    ? `Lectura ${Math.round(document.confidence)} %`
                    : 'No legible'}
                  {document.nameScore !== null &&
                    ` · Coincidencia del nombre ${Math.round(document.nameScore * 100)} %`}
                </span>
                {document.alerts.length > 0 && (
                  <p className="small">
                    {document.alerts
                      .map((alert) => ALERTS[alert] ?? alert)
                      .join('. ')}
                    .
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="verification-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={busy || pending || !complete}
          onClick={() => void analyze()}
        >
          {review ? 'Analizar de nuevo' : 'Analizar documentos'}
        </button>
      </div>
    </div>
  );
}
