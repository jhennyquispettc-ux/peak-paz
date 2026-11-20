import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import SiteHeader from '../components/SiteHeader';

export default function ConfirmEmailPage() {
  // Require a click so link scanners and React StrictMode cannot consume the token.
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '',
  );
  const [status, setStatus] = useState<'ready' | 'busy' | 'done'>('ready');
  const [error, setError] = useState('');
  const { user, refresh } = useAuth();
  async function confirm() {
    setStatus('busy');
    setError('');
    try {
      await api('/verification/email/confirm', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      window.history.replaceState(null, '', '/verificar-correo');
      setStatus('done');
      if (user) await refresh().catch(() => undefined);
    } catch (caught) {
      setError((caught as Error).message);
      setStatus('ready');
    }
  }
  return (
    <div className="pp app-shell">
      <SiteHeader />
      <main className="verification-page verification-narrow">
        <section className="verification-section card">
          <h1 className="h1">
            {status === 'done'
              ? 'Correo confirmado'
              : 'Un paso más para empezar'}
          </h1>
          <p className="muted">
            {status === 'done'
              ? 'La cuenta asociada a este enlace ya tiene su correo confirmado. Puedes continuar con tu cuenta.'
              : 'Confirma el correo de tu cuenta de Peak Paz con el botón de abajo.'}
          </p>
          {error && (
            <p className="notice notice-danger" role="alert">
              {error}
            </p>
          )}
          {status !== 'done' && /^[a-f0-9]{64}$/.test(token) && (
            <button
              className="btn btn-primary"
              disabled={status === 'busy'}
              onClick={() => void confirm()}
            >
              {status === 'busy' ? 'Confirmando…' : 'Confirmar mi correo'}
            </button>
          )}
          {status !== 'done' && !/^[a-f0-9]{64}$/.test(token) && (
            <p className="notice">
              Abre el enlace completo del correo o solicita uno nuevo desde tu
              cuenta.
            </p>
          )}
          <Link
            className="btn btn-ghost"
            to={
              user && ['GUIDE', 'TOURIST'].includes(user.role)
                ? '/mi-verificacion'
                : '/ingresar'
            }
          >
            {user && ['GUIDE', 'TOURIST'].includes(user.role)
              ? 'Continuar con mi verificación'
              : 'Ingresar a mi cuenta'}
          </Link>
        </section>
      </main>
    </div>
  );
}
