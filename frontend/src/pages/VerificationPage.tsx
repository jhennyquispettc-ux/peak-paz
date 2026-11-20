import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  DOCUMENTS,
  REVIEW_LABELS,
  downloadDocument,
  uploadGuideDocument,
  type GuideProfile,
  type VerificationState,
} from '../api/verification';
import { useAuth } from '../auth/AuthContext';
import SiteHeader from '../components/SiteHeader';

function DocumentUpload({
  type,
  label,
  profile,
  reload,
}: {
  type: string;
  label: string;
  profile: GuideProfile;
  reload: () => Promise<void>;
}) {
  const current = profile.documents.find((document) => document.type === type);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('file');
    if (!(file instanceof File) || !file.size) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo debe pesar como máximo 5 MB.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await uploadGuideDocument(
        type,
        file,
        String(data.get('expiresAt') || ''),
      );
      form.reset();
      await reload();
      setMessage(
        'Documento guardado. Si ya estabas aprobado, se requiere una nueva revisión.',
      );
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="credential-row">
      <div className="credential-heading">
        <h3 className="h3">{label}</h3>
        <span
          className={`badge ${profile.missingDocuments.includes(type) ? 'badge-warning' : 'badge-success'}`}
        >
          {current
            ? profile.missingDocuments.includes(type)
              ? 'Vencido'
              : 'Cargado'
            : 'Falta cargar'}
        </span>
      </div>
      {current && (
        <div className="verification-actions">
          <span className="small muted">
            {current.expiresAt
              ? `Vence: ${current.expiresAt}`
              : 'Sin vencimiento declarado'}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              void downloadDocument(
                `/guides/me/documents/${current.id}/file`,
              ).catch((error) => setError((error as Error).message));
            }}
          >
            Descargar
          </button>
        </div>
      )}
      <form onSubmit={submit} className="document-form">
        <div className="field">
          <label htmlFor={`file-${type}`}>
            {current ? 'Reemplazar archivo' : 'Archivo PDF, JPG o PNG'}
          </label>
          <input
            id={`file-${type}`}
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            required
            disabled={busy}
          />
        </div>
        <div className="field">
          <label htmlFor={`expiry-${type}`}>Vencimiento, si corresponde</label>
          <input
            id={`expiry-${type}`}
            name="expiresAt"
            type="date"
            disabled={busy}
          />
        </div>
        <button className="btn btn-secondary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar documento'}
        </button>
      </form>
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
    </section>
  );
}

export default function VerificationPage() {
  const { user, loading, refresh } = useAuth();
  const [state, setState] = useState<VerificationState | null>(null);
  const [profile, setProfile] = useState<GuideProfile | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const userId = user?.id;
  const role = user?.role;
  const reload = useCallback(async () => {
    if (!userId || (role !== 'GUIDE' && role !== 'TOURIST')) return;
    const [next, guide] = await Promise.all([
      api<VerificationState>('/verification/me'),
      role === 'GUIDE'
        ? api<GuideProfile>('/guides/me')
        : Promise.resolve(null),
    ]);
    setState(next);
    setProfile(guide);
    setError('');
    await refresh();
  }, [userId, role, refresh]);

  useEffect(() => {
    void reload().catch((caught) => setError((caught as Error).message));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => {
      if (!document.hidden)
        void reload().catch((caught) => setError((caught as Error).message));
    }, 15_000);
    return () => {
      clearInterval(timer);
      clearInterval(poll);
    };
  }, [reload]);

  if (loading)
    return <main className="verification-page">Cargando tu cuenta…</main>;
  if (!user)
    return (
      <Navigate to="/ingresar" state={{ from: '/mi-verificacion' }} replace />
    );
  if (!['GUIDE', 'TOURIST'].includes(user.role))
    return <Navigate to="/rutas" replace />;
  const verified = Boolean(state?.emailVerifiedAt || user.emailVerifiedAt);
  const wait = state
    ? Math.max(
        0,
        Math.ceil((new Date(state.nextResendAt).getTime() - now) / 1000),
      )
    : 0;
  async function act(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      await reload();
      setMessage(success);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="pp app-shell">
      <SiteHeader />
      <main className="verification-page">
        <header className="verification-intro">
          <Link to="/rutas" className="back small">
            Volver a las rutas
          </Link>
          <h1 className="h1">Prepara tu cuenta para el camino</h1>
          <p className="body muted">
            {user.role === 'GUIDE'
              ? 'Confirma tu correo y presenta tus credenciales para ofrecer tus servicios como guía.'
              : 'Confirma tu correo para poder solicitar un guía o unirte a una salida.'}
          </p>
        </header>
        {error && (
          <p className="notice notice-danger" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="notice notice-info" role="status">
            {message}
          </p>
        )}
        <section className="verification-section card">
          <div className="credential-heading">
            <h2 className="h2">Confirma tu correo</h2>
            <span
              className={`badge ${verified ? 'badge-success' : 'badge-warning'}`}
            >
              {verified ? 'Correo confirmado' : 'Pendiente'}
            </span>
          </div>
          <p>
            Tu correo es <strong>{user.email}</strong>.
          </p>
          {verified ? (
            <p className="muted">
              {user.role === 'GUIDE'
                ? 'El siguiente paso es completar tus documentos.'
                : 'Tu cuenta ya puede realizar reservas.'}
            </p>
          ) : (
            <>
              <p className="muted">
                Abre el mensaje de Peak Paz y pulsa “Confirmar mi correo”.
                Revisa también la carpeta de spam. El enlace vence a los 30
                minutos.
              </p>
              {!state && !error && (
                <p role="status">Preparando tu verificación…</p>
              )}
              <div className="verification-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || wait > 0 || !state}
                  onClick={() =>
                    void act(
                      () =>
                        api('/verification/email/resend', { method: 'POST' }),
                      'Solicitamos un nuevo correo. El enlace anterior dejará de funcionar.',
                    )
                  }
                >
                  {wait > 0
                    ? `Puedes reenviar en ${wait} s`
                    : 'Reenviar correo'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => void act(reload, 'Estado actualizado.')}
                >
                  Ya confirmé, actualizar
                </button>
              </div>
            </>
          )}
        </section>
        {profile && (
          <section className="verification-section card">
            <div className="credential-heading">
              <h2 className="h2">Tus credenciales de guía</h2>
              <span
                className={`badge ${profile.verificationStatus === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}
              >
                {REVIEW_LABELS[profile.verificationStatus]}
              </span>
            </div>
            <p className="muted">
              Sube documentos legibles de hasta 5 MB. Un administrador revisará
              que correspondan a tus datos y que estén vigentes.
            </p>
            {profile.rejectionReason && (
              <p className="notice notice-danger">
                Corrige lo siguiente: {profile.rejectionReason}
              </p>
            )}
            {DOCUMENTS.map((document) => (
              <DocumentUpload
                key={document.type}
                {...document}
                profile={profile}
                reload={reload}
              />
            ))}
            {profile.verificationStatus !== 'APPROVED' && (
              <div className="review-submit">
                <p className="small muted">
                  {!verified
                    ? 'Confirma tu correo antes de solicitar la revisión.'
                    : profile.missingDocuments.length
                      ? 'Carga todos los documentos vigentes antes de solicitar la revisión.'
                      : 'Cuando todo esté listo, solicita que revisemos tus documentos.'}
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={
                    busy || !verified || profile.missingDocuments.length > 0
                  }
                  onClick={() =>
                    void act(
                      () =>
                        api('/guides/me/verification-request', {
                          method: 'POST',
                        }),
                      'Tu solicitud de revisión fue enviada.',
                    )
                  }
                >
                  Solicitar revisión
                </button>
              </div>
            )}
          </section>
        )}
        {state && state.reviews.length > 0 && (
          <section className="verification-section">
            <h2 className="h2">Historial de revisión</h2>
            <ul className="review-history">
              {state.reviews.map((review) => (
                <li key={review.id}>
                  <strong>{REVIEW_LABELS[review.status]}</strong>
                  <span className="small muted">
                    {new Date(review.createdAt).toLocaleString('es-BO')}
                  </span>
                  {review.reason && <p>{review.reason}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
