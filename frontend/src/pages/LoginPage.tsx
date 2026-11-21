import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { homeFor } from '../auth/roles';
import PeakPazHero from '../brand/PeakPazHero';

type Mode = 'login' | 'register';

export default function LoginPage({ mode }: { mode: Mode }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountRole, setAccountRole] = useState<
    'TOURIST' | 'GUIDE' | 'AGENCY'
  >(
    'TOURIST',
  );
  const [guide, setGuide] = useState({
    nationalId: '',
    languages: 'es',
    yearsExperience: '0',
  });
  const [agency, setAgency] = useState({
    legalName: '',
    taxId: '',
    operatorLicense: '',
    association: '',
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
                    operatorLicense: agency.operatorLicense.trim(),
                    association: agency.association.trim(),
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

      <section
        className="login-form"
        aria-label={isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
      >
        <form className="login-panel" onSubmit={submit}>
          <p className="eyebrow">
            {isLogin ? 'BIENVENIDO DE VUELTA' : 'TU PRIMERA CUMBRE'}
          </p>
          <h1 className="h2">{isLogin ? 'Hola de nuevo' : 'Crea tu cuenta'}</h1>
          <p className="small login-sub">
            Ingresa para reservar tu guía o unirte a una salida grupal
          </p>

          {!isLogin && (
            <div className="chips" role="group" aria-label="Tipo de cuenta">
              <button
                type="button"
                className="chip"
                aria-pressed={accountRole === 'TOURIST'}
                onClick={() => setAccountRole('TOURIST')}
              >
                Soy turista
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={accountRole === 'GUIDE'}
                onClick={() => setAccountRole('GUIDE')}
              >
                Soy guía
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={accountRole === 'AGENCY'}
                onClick={() => setAccountRole('AGENCY')}
              >
                Soy agencia
              </button>
            </div>
          )}
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

          {!isLogin && accountRole === 'GUIDE' && (
            <>
              <div className="field">
                <label htmlFor="nationalId">Cédula de identidad</label>
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
                    Idiomas, separados por comas
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
                  <label htmlFor="yearsExperience">Años de experiencia</label>
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
                Después del registro confirmarás tu correo y cargarás tus tres
                documentos de guía.
              </p>
            </>
          )}

          {!isLogin && accountRole === 'AGENCY' && (
            <>
              <div className="field">
                <label htmlFor="legalName">Razón social</label>
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
              <div className="field-row">
                <div className="field">
                  <label htmlFor="taxId">NIT</label>
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
                  <label htmlFor="operatorLicense">Licencia de operador</label>
                  <input
                    id="operatorLicense"
                    value={agency.operatorLicense}
                    onChange={(event) =>
                      setAgency({
                        ...agency,
                        operatorLicense: event.target.value,
                      })
                    }
                    maxLength={40}
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="association">Asociación</label>
                <input
                  id="association"
                  value={agency.association}
                  onChange={(event) =>
                    setAgency({ ...agency, association: event.target.value })
                  }
                  maxLength={120}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="address">Dirección</label>
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
                Después del registro cargarás los documentos de la agencia en tu
                panel.
              </p>
            </>
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

          <button
            className="btn btn-primary wide"
            type="submit"
            disabled={sending}
          >
            {sending ? 'Un momento...' : isLogin ? 'Ingresar' : 'Crear cuenta'}
          </button>

          <p className="login-foot">
            {isLogin ? (
              <>
                ¿Primera vez en Peak Paz?{' '}
                <Link to="/registro">Crear cuenta</Link>
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
