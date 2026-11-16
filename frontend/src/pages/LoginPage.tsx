import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import PeakPazHero from '../brand/PeakPazHero';

type Mode = 'login' | 'register';

export default function LoginPage({ mode }: { mode: Mode }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [replay, setReplay] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const target =
    (location.state as { from?: string } | null)?.from ?? '/rutas';
  const isLogin = mode === 'login';

  const update = (field: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form);
      navigate(target, { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Algo salió mal. Intenta de nuevo.',
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="login pp">
      <section className="login-art" aria-label="Peak Paz">
        <PeakPazHero variant="full" tagline replayKey={replay} />
        <p className="login-note">Senderos de La Paz con guías verificados</p>
        <button
          type="button"
          className="login-replay"
          onClick={() => setReplay((count) => count + 1)}
        >
          Ver de nuevo
        </button>
      </section>

      <section className="login-form" aria-label={isLogin ? 'Iniciar sesión' : 'Crear cuenta'}>
        <form className="login-panel" onSubmit={submit} noValidate>
          <p className="eyebrow">
            {isLogin ? 'BIENVENIDO DE VUELTA' : 'TU PRIMERA CUMBRE'}
          </p>
          <h1 className="h2">{isLogin ? 'Hola de nuevo' : 'Crea tu cuenta'}</h1>
          <p className="small login-sub">
            Ingresa para reservar tu guía o unirte a una salida grupal
          </p>

          {!isLogin && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="firstName">Nombre</label>
                <input
                  id="firstName"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={(event) => update('firstName')(event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="lastName">Apellido</label>
                <input
                  id="lastName"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(event) => update('lastName')(event.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              placeholder="ana@correo.com"
              autoComplete="email"
              value={form.email}
              onChange={(event) => update('email')(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pass">Contraseña</label>
            <input
              id="pass"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={form.password}
              onChange={(event) => update('password')(event.target.value)}
              required
            />
            {!isLogin && (
              <span className="field-hint">
                Entre 8 y 64 caracteres, con al menos una letra y un número
              </span>
            )}
          </div>

          {error && (
            <p className="form-error" role="alert">
              <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              {error}
            </p>
          )}

          <button className="btn btn-primary wide" type="submit" disabled={sending}>
            {sending ? 'Un momento...' : isLogin ? 'Ingresar' : 'Crear cuenta'}
          </button>

          <p className="login-foot">
            {isLogin ? (
              <>
                ¿Primera vez en Peak Paz? <Link to="/registro">Crear cuenta</Link>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta? <Link to="/ingresar">Ingresar</Link>
              </>
            )}
          </p>
          <p className="login-foot">
            <Link to="/rutas">Explorar rutas sin cuenta</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
