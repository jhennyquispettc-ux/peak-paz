import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import RequireApprovedGuide from './auth/RequireApprovedGuide';
import RequireRole from './auth/RequireRole';
import { I18nProvider } from './i18n/I18nContext';
import { getAgencySanctions, listAgencyPayouts } from './api/agency';
import { getGuideSanctions, listGuidePayouts } from './api/guide';
import ByRole from './layout/ByRole';
import PanelLayout from './layout/PanelLayout';
import TouristLayout from './layout/TouristLayout';
import NotificationsPage from './notifications/NotificationsPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminCancellationsPage from './pages/admin/AdminCancellationsPage';
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminDisputesPage from './pages/admin/AdminDisputesPage';
import AdminHelpPage from './pages/admin/AdminHelpPage';
import AdminPayoutsPage from './pages/admin/AdminPayoutsPage';
import AdminReviewsPage from './pages/admin/AdminReviewsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminStrikesPage from './pages/admin/AdminStrikesPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminVerificationsPage from './pages/admin/AdminVerificationsPage';
import AdminRouteEditorPage from './pages/admin/routes/AdminRouteEditorPage';
import AdminRoutesPage from './pages/admin/routes/AdminRoutesPage';
import AgencyDepartureDetailPage from './pages/agency/AgencyDepartureDetailPage';
import AgencyDeparturesPage from './pages/agency/AgencyDeparturesPage';
import AgencyHomePage from './pages/agency/AgencyHomePage';
import AgencyProfilePage from './pages/agency/AgencyProfilePage';
import AgencyReviewsPage from './pages/agency/AgencyReviewsPage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import GuideAgendaPage from './pages/guide/GuideAgendaPage';
import GuideBookingDetailPage from './pages/guide/GuideBookingDetailPage';
import GuideBookingsPage from './pages/guide/GuideBookingsPage';
import GuideHomePage from './pages/guide/GuideHomePage';
import GuideProfilePage from './pages/guide/GuideProfilePage';
import GuideReviewsPage from './pages/guide/GuideReviewsPage';
import GuideRoutesPage from './pages/guide/GuideRoutesPage';
import LoginPage from './pages/LoginPage';
import ProviderPayoutsPage from './pages/provider/ProviderPayoutsPage';
import ProviderSanctionsPage from './pages/provider/ProviderSanctionsPage';
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
                  <Route path="ayuda" element={<AdminHelpPage />} />
                  <Route path="reclamos" element={<AdminComplaintsPage />} />
                  <Route path="strikes" element={<AdminStrikesPage />} />
                  <Route path="rutas" element={<AdminRoutesPage />} />
                  <Route
                    path="rutas/nueva"
                    element={<AdminRouteEditorPage />}
                  />
                  <Route path="rutas/:id" element={<AdminRouteEditorPage />} />
                  <Route path="usuarios" element={<AdminUsersPage />} />
                  <Route path="reservas" element={<AdminBookingsPage />} />
                  <Route path="liquidaciones" element={<AdminPayoutsPage />} />
                  <Route path="resenas" element={<AdminReviewsPage />} />
                  <Route path="reglas" element={<AdminSettingsPage />} />
                  <Route path="avisos" element={<NotificationsPage />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Route>
              </Route>

              <Route element={<RequireRole roles={['GUIDE', 'AGENCY']} />}>
                <Route element={<RequireApprovedGuide />}>
                  <Route path="/panel" element={<PanelLayout />}>
                    <Route
                      index
                      element={
                        <ByRole
                          guide={<GuideHomePage />}
                          agency={<AgencyHomePage />}
                        />
                      }
                    />
                    <Route
                      path="reservas"
                      element={
                        <ByRole
                          guide={<GuideBookingsPage />}
                          agency={<Navigate to="/panel/salidas" replace />}
                        />
                      }
                    />
                    <Route
                      path="reservas/:id"
                      element={
                        <ByRole
                          guide={<GuideBookingDetailPage />}
                          agency={<Navigate to="/panel/salidas" replace />}
                        />
                      }
                    />
                    <Route
                      path="agenda"
                      element={
                        <ByRole
                          guide={<GuideAgendaPage />}
                          agency={<Navigate to="/panel" replace />}
                        />
                      }
                    />
                    <Route
                      path="mis-rutas"
                      element={
                        <ByRole
                          guide={<GuideRoutesPage />}
                          agency={<Navigate to="/panel" replace />}
                        />
                      }
                    />
                    <Route
                      path="salidas"
                      element={
                        <ByRole
                          guide={<Navigate to="/panel" replace />}
                          agency={<AgencyDeparturesPage />}
                        />
                      }
                    />
                    <Route
                      path="salidas/:id"
                      element={
                        <ByRole
                          guide={<Navigate to="/panel" replace />}
                          agency={<AgencyDepartureDetailPage />}
                        />
                      }
                    />
                    <Route
                      path="liquidaciones"
                      element={
                        <ByRole
                          guide={
                            <ProviderPayoutsPage load={listGuidePayouts} />
                          }
                          agency={
                            <ProviderPayoutsPage load={listAgencyPayouts} />
                          }
                        />
                      }
                    />
                    <Route
                      path="resenas"
                      element={
                        <ByRole
                          guide={<GuideReviewsPage />}
                          agency={<AgencyReviewsPage />}
                        />
                      }
                    />
                    <Route
                      path="sanciones"
                      element={
                        <ByRole
                          guide={
                            <ProviderSanctionsPage load={getGuideSanctions} />
                          }
                          agency={
                            <ProviderSanctionsPage load={getAgencySanctions} />
                          }
                        />
                      }
                    />
                    <Route
                      path="perfil"
                      element={
                        <ByRole
                          guide={<GuideProfilePage />}
                          agency={<AgencyProfilePage />}
                        />
                      }
                    />
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
