import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import RequireApprovedGuide from './auth/RequireApprovedGuide';
import RequireRole from './auth/RequireRole';
import { I18nProvider } from './i18n/I18nContext';
import { ADMIN_PATHS, PROVIDER_PATHS } from './layout/navigation';
import PanelLayout from './layout/PanelLayout';
import TouristLayout from './layout/TouristLayout';
import NotificationsPage from './notifications/NotificationsPage';
import AdminCancellationsPage from './pages/admin/AdminCancellationsPage';
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminDisputesPage from './pages/admin/AdminDisputesPage';
import AdminStrikesPage from './pages/admin/AdminStrikesPage';
import AdminVerificationsPage from './pages/admin/AdminVerificationsPage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import LoginPage from './pages/LoginPage';
import RouteDetailPage from './pages/RouteDetailPage';
import RoutesPage from './pages/RoutesPage';
import ComingSoonPage from './pages/shared/ComingSoonPage';
import VerificationPage from './pages/VerificationPage';
import { ToastProvider } from './ui/Toast';

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/rutas" replace />} />
              <Route path="/ingresar" element={<LoginPage mode="login" />} />
              <Route path="/registro" element={<LoginPage mode="register" />} />
              <Route path="/mi-verificacion" element={<VerificationPage />} />
              <Route path="/verificar-correo" element={<ConfirmEmailPage />} />
              <Route path="/rutas" element={<RoutesPage />} />
              <Route path="/rutas/:slug" element={<RouteDetailPage />} />

              <Route element={<RequireRole roles={['TOURIST']} />}>
                <Route element={<TouristLayout />}>
                  <Route path="/avisos" element={<NotificationsPage />} />
                  <Route
                    path="/reservas/*"
                    element={
                      <ComingSoonPage
                        title="Mis reservas"
                        phase="F6"
                        what="tus reservas, pagos, cancelaciones, reseñas y reclamos"
                      />
                    }
                  />
                </Route>
              </Route>

              <Route element={<RequireRole roles={['ADMIN']} />}>
                <Route path="/admin" element={<PanelLayout />}>
                  <Route index element={<AdminDashboardPage />} />
                  <Route
                    path="verificaciones"
                    element={<AdminVerificationsPage />}
                  />
                  <Route
                    path="cancelaciones"
                    element={<AdminCancellationsPage />}
                  />
                  <Route path="disputas" element={<AdminDisputesPage />} />
                  <Route path="reclamos" element={<AdminComplaintsPage />} />
                  <Route path="strikes" element={<AdminStrikesPage />} />
                  {ADMIN_PATHS.map((path) => (
                    <Route
                      key={path}
                      path={`${path}/*`}
                      element={<ComingSoonPage />}
                    />
                  ))}
                  <Route path="avisos" element={<NotificationsPage />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Route>
              </Route>

              <Route element={<RequireRole roles={['GUIDE', 'AGENCY']} />}>
                <Route element={<RequireApprovedGuide />}>
                  <Route path="/panel" element={<PanelLayout />}>
                    <Route index element={<ComingSoonPage />} />
                    {PROVIDER_PATHS.map((path) => (
                      <Route
                        key={path}
                        path={`${path}/*`}
                        element={<ComingSoonPage />}
                      />
                    ))}
                    <Route path="avisos" element={<NotificationsPage />} />
                    <Route
                      path="*"
                      element={<Navigate to="/panel" replace />}
                    />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/rutas" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
