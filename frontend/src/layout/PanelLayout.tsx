import { ExternalLink, LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { SpanishScope } from '../i18n/I18nContext';
import NotificationBell from '../notifications/NotificationBell';
import {
  areaLabelFor,
  baseFor,
  navigationFor,
  NOTICES_ITEM,
  type NavItem,
} from './navigation';

function SideLink({
  base,
  item,
}: {
  base: string;
  item: Pick<NavItem, 'path' | 'label' | 'icon'>;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path ? `${base}/${item.path}` : base}
      end={!item.path}
      className="side-link"
    >
      <Icon aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function PanelLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (!user) return null;
  const base = baseFor(user.role);

  return (
    <SpanishScope>
      <div className="pp panel-shell">
        <aside
          className={`panel-side ${open ? 'open' : ''}`}
          aria-label="Menú del panel"
        >
          <div className="panel-brand">
            <Link to={base} aria-label="Peak Paz, inicio del panel">
              <img
                src="/brand/peakpaz-logo-negativo.svg"
                alt="Peak Paz"
                height="30"
              />
            </Link>
            <button
              type="button"
              className="icon-btn on-dark panel-close"
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <p className="panel-area">{areaLabelFor(user.role)}</p>
          <nav className="side-nav">
            {navigationFor(user.role).map((group) => (
              <div key={group.title} className="side-group">
                <p className="side-title">{group.title}</p>
                {group.items.map((item) => (
                  <SideLink key={item.path} base={base} item={item} />
                ))}
              </div>
            ))}
            <div className="side-group">
              <SideLink base={base} item={NOTICES_ITEM} />
            </div>
          </nav>
          <div className="side-foot">
            <Link to="/rutas" className="side-link">
              <ExternalLink aria-hidden="true" />
              <span>Ver web pública</span>
            </Link>
            <button
              type="button"
              className="side-link"
              onClick={() => {
                logout();
                navigate('/rutas');
              }}
            >
              <LogOut aria-hidden="true" />
              <span>Salir</span>
            </button>
          </div>
        </aside>
        {open && (
          <button
            type="button"
            className="panel-scrim"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
        )}
        <div className="panel-main">
          <header className="panel-top">
            <button
              type="button"
              className="icon-btn panel-menu"
              aria-label="Abrir menú"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu aria-hidden="true" />
            </button>
            <span className="panel-user">
              {user.firstName} {user.lastName}
            </span>
            <NotificationBell />
          </header>
          <main className="panel-content">
            <Outlet />
          </main>
        </div>
      </div>
    </SpanishScope>
  );
}
