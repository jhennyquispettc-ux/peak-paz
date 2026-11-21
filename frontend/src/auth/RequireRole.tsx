import { Navigate, Outlet, useLocation } from "react-router-dom";
import LoadingState from "../ui/LoadingState";
import { useAuth } from "./AuthContext";
import { homeFor, needsEmailCheck, type Role } from "./roles";

export default function RequireRole({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState />;
  if (!user) {
    return (
      <Navigate
        to="/ingresar"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    );
  }
  if (!roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }
  if (needsEmailCheck(user)) return <Navigate to="/mi-verificacion" replace />;
  return <Outlet />;
}
