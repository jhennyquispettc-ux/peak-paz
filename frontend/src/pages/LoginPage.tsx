import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { homeFor } from '../auth/roles';
import PeakPazHero from '../brand/PeakPazHero';
import { useI18n } from '../i18n/I18nContext';

type Mode = 'login' | 'register';

export default function LoginPage({ mode }: { mode: Mode }) {
  const { login, register } = useAuth();
  const { pick, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountRole, setAccountRole] = useState<
    'TOURIST' | 'GUIDE' | 'AGENCY'
  >('TOURIST');
  const [guide, setGuide] = useState({
    nationalId: '',
    languages: 'es',
    yearsExperience: '0',
  });
  const [agency, setAgency] = useState({
    legalName: '',
    taxId: '',
    address: '',
  });
  const [replay, setReplay] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const target = (location.state as { from?: string } | null)?.from;
  const isLogin = mode === 'login';

  const update = (field: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const sessionUser = isLogin
        ? await login(form.email, form.password)
        : await register({
            ...form,
            role: accountRole,
            ...(accountRole === 'GUIDE'
              ? {
                  nationalId: guide.nationalId.trim().toUpperCase(),
                  languages: guide.languages
                    .split(',')
                    .map((value) => value.trim().toLowerCase())
                    .filter(Boolean),
                  yearsExperience: Number(guide.yearsExperience),
                }
              : accountRole === 'AGENCY'
                ? {
                    legalName: agency.legalName.trim(),
                    taxId: agency.taxId.trim(),
                    address: agency.address.trim(),
                  }
                : {}),
          });
      navigate(
        ['TOURIST', 'GUIDE'].includes(sessionUser.role) &&
          (!isLogin || !sessionUser.emailVerifiedAt)
          ? '/mi-verificacion'
          : (target ?? homeFor(sessionUser.role)),
        { replace: true },
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : pick(
              'Algo salió mal. Intenta de nuevo.',
              'Something went wrong. Please try again.',
            ),
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="login pp">
      <section className="login-art" aria-label="Peak Paz">
        <PeakPazHero variant="full" tagline replayKey={replay} />
        <p className="login-note">
          {pick(
            'Senderos de La Paz con guías verificados',
            'La Paz trails with verified guides',
          )}
        </p>
        <button
          type="button"
          className="login-replay"
          onClick={() => setReplay((count) => count + 1)}
        >
          {pick('Ver de nuevo', 'Replay')}
        </button>
      </section>

      <section
        className="login-form"
        aria-label={
          isLogin
            ? pick('Iniciar sesión', 'Sign in')
            : pick('Crear cuenta', 'Create account')
        }
      >
        <form className="login-panel" onSubmit={submit}>
          <button
            type="button"
            className="btn btn-sm btn-ghost align-start"
            aria-label={pick(
              'Cambiar idioma a inglés',
              'Switch language to Spanish',
            )}
            onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
          >
            {locale === 'es' ? 'English' : 'Español'}
          </button>
          <p className="eyebrow">
            {isLogin
              ? pick('BIENVENIDO DE VUELTA', 'WELCOME BACK')
              : pick('TU PRIMERA CUMBRE', 'YOUR FIRST SUMMIT')}
          </p>
          <h1 className="h2">
            {isLogin
              ? pick('Hola de nuevo', 'Hello again')
              : pick('Crea tu cuenta', 'Create your account')}
          </h1>
          <p className="small login-sub">
            {pick(
              'Ingresa para reservar tu guía o unirte a una salida grupal',
              'Sign in to book your guide or join a group departure',
            )}
          </p>

          {!isLogin && (
            <div
              className="chips"
              role="group"
              aria-label={pick('Tipo de cuenta', 'Account type')}
            >
              <button
                type="button"
                className="chip"
                aria-pressed={accountRole === 'TOURIST'}
                onClick={() => setAccountRole('TOURIST')}
              >
                {pick('Soy turista', 'I am a tourist')}
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={accountRole === 'GUIDE'}
                onClick={() => setAccountRole('GUIDE')}
              >
                {pick('Soy guía', 'I am a guide')}
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={accountRole === 'AGENCY'}
                onClick={() => setAccountRole('AGENCY')}
              >
                {pick('Soy agencia', 'I am an agency')}
              </button>
            </div>
          )}
          {!isLogin && (
            <div className="field-row">
              <div className="field">
                <label htmlFor="firstName">
                  {pick('Nombre', 'First name')}
                </label>
                <input
                  id="firstName"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={(event) => update('firstName')(event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="lastName">
                  {pick('Apellido', 'Last name')}
                </label>
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

          {!isLogin && accountRole === 'GUIDE' && (
            <>
              <div className="field">
                <label htmlFor="nationalId">
                  {pick('Cédula de identidad', 'National ID')}
                </label>
                <input
                  id="nationalId"
                  value={guide.nationalId}
                  onChange={(event) =>
                    setGuide({ ...guide, nationalId: event.target.value })
                  }
                  placeholder="6123456-1B"
                  required
                  maxLength={20}
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="languages">
                    {pick(
                      'Idiomas, separados por comas',
                      'Languages, separated by commas',
                    )}
                  </label>
                  <input
                    id="languages"
                    value={guide.languages}
                    onChange={(event) =>
                      setGuide({ ...guide, languages: event.target.value })
                    }
                    placeholder="es, en, ay"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="yearsExperience">
                    {pick('Años de experiencia', 'Years of experience')}
                  </label>
                  <input
                    id="yearsExperience"
                    type="number"
                    min="0"
                    max="60"
                    step="1"
                    value={guide.yearsExperience}
                    onChange={(event) =>
                      setGuide({
                        ...guide,
                        yearsExperience: event.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <p className="field-hint">
                {pick(
                  'Después del registro confirmarás tu correo y cargarás tus tres documentos de guía.',
                  'After signing up you will confirm your email and upload your three guide documents.',
                )}
              </p>
            </>
          )}

          {!isLogin && accountRole === 'AGENCY' && (
            <>
              <div className="field">
                <label htmlFor="legalName">
                  {pick('Razón social', 'Legal name')}
                </label>
                <input
                  id="legalName"
                  value={agency.legalName}
                  onChange={(event) =>
                    setAgency({ ...agency, legalName: event.target.value })
                  }
                  maxLength={160}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="taxId">{pick('NIT', 'Tax ID')}</label>
                <input
                  id="taxId"
                  inputMode="numeric"
                  value={agency.taxId}
                  onChange={(event) =>
                    setAgency({ ...agency, taxId: event.target.value })
                  }
                  pattern="[0-9]{7,15}"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="address">{pick('Dirección', 'Address')}</label>
                <input
                  id="address"
                  value={agency.address}
                  onChange={(event) =>
                    setAgency({ ...agency, address: event.target.value })
                  }
                  maxLength={200}
                  required
                />
              </div>
              <p className="field-hint">
                {pick(
                  'Después del registro cargarás los documentos de la agencia en tu panel.',
                  'After signing up you will upload the agency documents in your panel.',
                )}
              </p>
            </>
          )}

          <div className="field">
            <label htmlFor="email">{pick('Correo', 'Email')}</label>
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
            <label htmlFor="pass">{pick('Contraseña', 'Password')}</label>
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
                {pick(
                  'Entre 8 y 64 caracteres, con al menos una letra y un número',
                  'Between 8 and 64 characters, with at least one letter and one number',
                )}
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

          <button
            className="btn btn-primary wide"
            type="submit"
            disabled={sending}
          >
            {sending
              ? pick('Un momento...', 'One moment...')
              : isLogin
                ? pick('Ingresar', 'Sign in')
                : pick('Crear cuenta', 'Create account')}
          </button>

          <p className="login-foot">
            {isLogin ? (
              <>
                {pick('¿Primera vez en Peak Paz?', 'First time on Peak Paz?')}{' '}
                <Link to="/registro">
                  {pick('Crear cuenta', 'Create account')}
                </Link>
              </>
            ) : (
              <>
                {pick('¿Ya tienes cuenta?', 'Already have an account?')}{' '}
                <Link to="/ingresar">{pick('Ingresar', 'Sign in')}</Link>
              </>
            )}
          </p>
          <p className="login-foot">
            <Link to="/rutas">
              {pick(
                'Explorar rutas sin cuenta',
                'Explore trails without an account',
              )}
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
