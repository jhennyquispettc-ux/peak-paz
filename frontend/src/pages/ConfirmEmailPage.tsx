import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import SiteHeader from '../components/SiteHeader';
import { useI18n } from '../i18n/I18nContext';

export default function ConfirmEmailPage() {
  // Require a click so link scanners and React StrictMode cannot consume the token.
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '',
  );
  const [status, setStatus] = useState<'ready' | 'busy' | 'done'>('ready');
  const [error, setError] = useState('');
  const { user, refresh } = useAuth();
  const { pick } = useI18n();
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
              ? pick('Correo confirmado', 'Email confirmed')
              : pick('Un paso más para empezar', 'One more step to begin')}
          </h1>
          <p className="muted">
            {status === 'done'
              ? pick(
                  'La cuenta asociada a este enlace ya tiene su correo confirmado. Puedes continuar con tu cuenta.',
                  'The account linked to this email is now confirmed. You can continue with your account.',
                )
              : pick(
                  'Confirma el correo de tu cuenta de Peak Paz con el botón de abajo.',
                  'Confirm the email of your Peak Paz account with the button below.',
                )}
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
              {status === 'busy'
                ? pick('Confirmando…', 'Confirming…')
                : pick('Confirmar mi correo', 'Confirm my email')}
            </button>
          )}
          {status !== 'done' && !/^[a-f0-9]{64}$/.test(token) && (
            <p className="notice">
              {pick(
                'Abre el enlace completo del correo o solicita uno nuevo desde tu cuenta.',
                'Open the full link in the email or request a new one from your account.',
              )}
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
              ? pick(
                  'Continuar con mi verificación',
                  'Continue my verification',
                )
              : pick('Ingresar a mi cuenta', 'Sign in to my account')}
          </Link>
        </section>
      </main>
    </div>
  );
}
