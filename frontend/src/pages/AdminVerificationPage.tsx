import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  DOCUMENTS,
  REVIEW_LABELS,
  downloadDocument,
  type GuideProfile,
  type VerificationState,
} from '../api/verification';
import type { Page, User } from '../api/types';
import { useAuth } from '../auth/AuthContext';

export default function AdminVerificationPage() {
  const { user, loading } = useAuth();
  const [filter, setFilter] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [guides, setGuides] = useState<
    { id: string; fullName: string; email: string }[]
  >([]);
  const [profile, setProfile] = useState<GuideProfile | null>(null);
  const [history, setHistory] = useState<VerificationState | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const role = user?.role;
  const load = useCallback(async () => {
    if (role !== 'ADMIN') return;
    const result = await api<
      Page<{ id: string; fullName: string; email: string }>
    >(`/admin/guides?status=${filter}&page=${page}&limit=10`);
    setGuides(result.data);
    setTotalPages(result.meta.totalPages);
  }, [filter, page, role]);
  useEffect(() => {
    setProfile(null);
    setHistory(null);
    void load().catch((caught) => setError((caught as Error).message));
  }, [load]);
  async function select(id: string) {
    setBusy(true);
    setError('');
    setMessage('');
    setReason('');
    setProfile(null);
    setHistory(null);
    try {
      const next = await api<GuideProfile>(`/admin/guides/${id}`);
      const state = await api<VerificationState>(
        `/verification/admin/users/${next.user.id}`,
      );
      const freshUser = await api<User>(`/users/${next.user.id}`);
      setProfile({ ...next, user: freshUser });
      setHistory(state);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function decide(status: string) {
    if (!profile) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/admin/guides/${profile.id}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          ...(status === 'REJECTED' ? { rejectionReason: reason.trim() } : {}),
        }),
      });
      await load();
      setProfile(null);
      setHistory(null);
      setReason('');
      setMessage(
        status === 'APPROVED'
          ? 'Guía aprobado. La decisión quedó registrada.'
          : 'Guía rechazado. El motivo está disponible en su cuenta.',
      );
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <main className="verification-page">Cargando…</main>;
  if (!user)
    return (
      <Navigate
        to="/ingresar"
        state={{ from: '/admin/verificaciones' }}
        replace
      />
    );
  if (role !== 'ADMIN') return <Navigate to="/rutas" replace />;
  return (
    <div className="pp">
      <div className="verification-page">
        <header className="verification-intro">
          <h1 className="h1">Revisión de guías</h1>
          <p className="muted">
            Contrasta la identidad y las credenciales del guía antes de
            aprobarlo. El formato del archivo por sí solo no prueba su
            autenticidad.
          </p>
        </header>
        {error && (
          <p role="alert" className="notice notice-danger">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="notice notice-info">
            {message}
          </p>
        )}
        <div className="chips" role="group" aria-label="Estado de revisión">
          {Object.entries(REVIEW_LABELS).map(([value, label]) => (
            <button
              key={value}
              className="chip"
              aria-pressed={filter === value}
              disabled={busy}
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="admin-review-grid">
          <aside className="review-list">
            <h2 className="h3">Guías</h2>
            {guides.length === 0 && (
              <p className="notice">No hay guías en este estado.</p>
            )}
            {guides.map((guide) => (
              <button
                key={guide.id}
                type="button"
                className={`review-person ${profile?.id === guide.id ? 'selected' : ''}`}
                disabled={busy}
                onClick={() => void select(guide.id)}
              >
                <strong>{guide.fullName}</strong>
                <span>{guide.email}</span>
              </button>
            ))}
            <div className="verification-actions">
              <button
                className="btn btn-ghost btn-sm"
                disabled={page <= 1 || busy}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </button>
              <span className="small">Página {page}</span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={page >= totalPages || busy}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </button>
            </div>
          </aside>
          <section className="verification-section card">
            {!profile ? (
              <p role="status" className="muted">
                {busy
                  ? 'Cargando el expediente…'
                  : 'Selecciona un guía para revisar su expediente.'}
              </p>
            ) : (
              <>
                <h2 className="h2">
                  {profile.user.firstName} {profile.user.lastName}
                </h2>
                <p>
                  CI declarada: <strong>{profile.nationalId}</strong>
                </p>
                <p className="small">
                  Correo: {profile.user.email} ·{' '}
                  {profile.user.emailVerifiedAt
                    ? 'Confirmado'
                    : 'Sin confirmar'}
                </p>
                <span className="badge badge-info">
                  {REVIEW_LABELS[profile.verificationStatus]}
                </span>
                {DOCUMENTS.map((document) => {
                  const file = profile.documents.find(
                    (item) => item.type === document.type,
                  );
                  return (
                    <div className="credential-row" key={document.type}>
                      <div className="credential-heading">
                        <strong>{document.label}</strong>
                        <span
                          className={`badge ${profile.missingDocuments.includes(document.type) ? 'badge-warning' : 'badge-success'}`}
                        >
                          {profile.missingDocuments.includes(document.type)
                            ? 'Falta o está vencido'
                            : 'Disponible'}
                        </span>
                      </div>
                      {file && (
                        <div className="verification-actions">
                          <span className="small muted">
                            {file.expiresAt
                              ? `Vence: ${file.expiresAt}`
                              : 'Sin vencimiento declarado'}
                          </span>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              void downloadDocument(
                                `/admin/guides/${profile.id}/documents/${file.id}/file`,
                              ).catch((caught) =>
                                setError((caught as Error).message),
                              );
                            }}
                          >
                            Descargar para revisar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {history && history.reviews.length > 0 && (
                  <div>
                    <h3 className="h3">Historial</h3>
                    <ul className="review-history">
                      {history.reviews.map((review) => (
                        <li key={review.id}>
                          <strong>{REVIEW_LABELS[review.status]}</strong>
                          <span className="small muted">
                            {new Date(review.createdAt).toLocaleString('es-BO')}
                          </span>
                          {review.reason && <p>{review.reason}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {profile.verificationStatus === 'PENDING' && (
                  <>
                    <div className="field">
                      <label htmlFor="rejectionReason">
                        Motivo, obligatorio para rechazar
                      </label>
                      <textarea
                        id="rejectionReason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Explica qué debe corregir el guía"
                      />
                    </div>
                    <p className="small muted">
                      Al aprobar, confirmas que revisaste los documentos y su
                      correspondencia con los datos del guía.
                    </p>
                    <div className="verification-actions">
                      <button
                        className="btn btn-primary"
                        disabled={
                          busy ||
                          !profile.user.emailVerifiedAt ||
                          profile.missingDocuments.length > 0
                        }
                        onClick={() => void decide('APPROVED')}
                      >
                        Aprobar guía
                      </button>
                      <button
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
    </div>
  );
}
