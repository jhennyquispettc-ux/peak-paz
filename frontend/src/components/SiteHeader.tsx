import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="site-header">
      <Link to="/rutas" aria-label="Peak Paz, inicio" className="site-logo">
        <img
          src="/brand/peakpaz-logo-negativo.svg"
          alt="Peak Paz"
          height="30"
        />
      </Link>
      <nav className="site-nav" aria-label="Principal">
        <NavLink to="/rutas">Explorar rutas</NavLink>
        {user && ['TOURIST', 'GUIDE'].includes(user.role) && (
          <NavLink to="/mi-verificacion">Mi verificación</NavLink>
        )}
        {user?.role === 'ADMIN' && (
          <NavLink to="/admin/verificaciones">Revisar guías</NavLink>
        )}
      </nav>
      <div className="site-user">
        {user ? (
          <>
            <span className="site-user-name">Hola, {user.firstName}</span>
            <button
              type="button"
              className="btn btn-sm btn-on-dark"
              onClick={() => {
                logout();
                navigate('/rutas');
              }}
            >
              Salir
            </button>
          </>
        ) : (
          <Link to="/ingresar" className="btn btn-sm btn-on-dark">
            Ingresar
          </Link>
        )}
      </div>
    </header>
  );
}
