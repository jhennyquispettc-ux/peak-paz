import { Languages } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { homeFor } from '../auth/roles';
import { useI18n } from '../i18n/I18nContext';
import NotificationBell from '../notifications/NotificationBell';

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const { t, locale, setLocale, fixed } = useI18n();
  const navigate = useNavigate();
  const isTourist = user?.role === 'TOURIST';
  const hasPanel = Boolean(user && !isTourist);

  return (
    <header className="site-header">
      <Link to="/rutas" aria-label="Peak Paz" className="site-logo">
        <img
          src="/brand/peakpaz-logo-negativo.svg"
          alt="Peak Paz"
          height="30"
        />
      </Link>
      <nav className="site-nav" aria-label="Principal">
        <NavLink to="/rutas">{t('nav.explore')}</NavLink>
        {isTourist && <NavLink to="/reservas">{t('nav.bookings')}</NavLink>}
        {user && ['TOURIST', 'GUIDE'].includes(user.role) && (
          <NavLink to="/mi-verificacion">{t('nav.verification')}</NavLink>
        )}
        {user && hasPanel && (
          <NavLink to={homeFor(user.role)}>{t('nav.panel')}</NavLink>
        )}
      </nav>
      <div className="site-user">
        {!fixed && (
          <button
            type="button"
            className="btn btn-sm btn-on-dark lang-btn"
            aria-label={t('nav.language')}
            onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
          >
            <Languages aria-hidden="true" />
            {locale === 'es' ? 'EN' : 'ES'}
          </button>
        )}
        {user && <NotificationBell onDark />}
        {user ? (
          <>
            <span className="site-user-name">
              {t('nav.hello', { name: user.firstName })}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-on-dark"
              onClick={() => {
                logout();
                navigate('/rutas');
              }}
            >
              {t('nav.signOut')}
            </button>
          </>
        ) : (
          <Link to="/ingresar" className="btn btn-sm btn-on-dark">
            {t('nav.signIn')}
          </Link>
        )}
      </div>
    </header>
  );
}
