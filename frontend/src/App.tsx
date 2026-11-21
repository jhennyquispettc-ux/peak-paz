import { lazy, Suspense } from 'react';
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
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import LoginPage from './pages/LoginPage';
import VerificationPage from './pages/VerificationPage';
import LoadingState from './ui/LoadingState';
import { ToastProvider } from './ui/Toast';

const RoutesPage = lazy(() => import('./pages/RoutesPage'));
const RouteDetailPage = lazy(() => import('./pages/RouteDetailPage'));
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'));
const AdminCancellationsPage = lazy(
  () => import('./pages/admin/AdminCancellationsPage'),
);
const AdminComplaintsPage = lazy(
  () => import('./pages/admin/AdminComplaintsPage'),
);
const AdminDashboardPage = lazy(
  () => import('./pages/admin/AdminDashboardPage'),
);
const AdminDisputesPage = lazy(() => import('./pages/admin/AdminDisputesPage'));
const AdminHelpPage = lazy(() => import('./pages/admin/AdminHelpPage'));
const AdminPayoutsPage = lazy(() => import('./pages/admin/AdminPayoutsPage'));
const AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminStrikesPage = lazy(() => import('./pages/admin/AdminStrikesPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminVerificationsPage = lazy(
  () => import('./pages/admin/AdminVerificationsPage'),
);
const AdminRouteEditorPage = lazy(
  () => import('./pages/admin/routes/AdminRouteEditorPage'),
);
const AdminRoutesPage = lazy(
  () => import('./pages/admin/routes/AdminRoutesPage'),
);
const AgencyDepartureDetailPage = lazy(
  () => import('./pages/agency/AgencyDepartureDetailPage'),
);
const AgencyDeparturesPage = lazy(
  () => import('./pages/agency/AgencyDeparturesPage'),
);
const AgencyHomePage = lazy(() => import('./pages/agency/AgencyHomePage'));
const AgencyProfilePage = lazy(
  () => import('./pages/agency/AgencyProfilePage'),
);
const AgencyReviewsPage = lazy(
  () => import('./pages/agency/AgencyReviewsPage'),
);
const GuideAgendaPage = lazy(() => import('./pages/guide/GuideAgendaPage'));
const GuideBookingDetailPage = lazy(
  () => import('./pages/guide/GuideBookingDetailPage'),
);
const GuideBookingsPage = lazy(() => import('./pages/guide/GuideBookingsPage'));
const GuideHomePage = lazy(() => import('./pages/guide/GuideHomePage'));
const GuideProfilePage = lazy(() => import('./pages/guide/GuideProfilePage'));
const GuideReviewsPage = lazy(() => import('./pages/guide/GuideReviewsPage'));
const GuideRoutesPage = lazy(() => import('./pages/guide/GuideRoutesPage'));
const ProviderPayoutsPage = lazy(
  () => import('./pages/provider/ProviderPayoutsPage'),
);
const ProviderSanctionsPage = lazy(
  () => import('./pages/provider/ProviderSanctionsPage'),
);
const BookingDetailPage = lazy(
  () => import('./pages/tourist/BookingDetailPage'),
);
const MyBookingsPage = lazy(() => import('./pages/tourist/MyBookingsPage'));
const PaymentPage = lazy(() => import('./pages/tourist/PaymentPage'));
const PaymentReturnPage = lazy(
  () => import('./pages/tourist/PaymentReturnPage'),
);

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<LoadingState />}>
              <Routes>
                <Route path="/" element={<Navigate to="/rutas" replace />} />
                <Route path="/ingresar" element={<LoginPage mode="login" />} />
                <Route
                  path="/registro"
                  element={<LoginPage mode="register" />}
                />
                <Route path="/mi-verificacion" element={<VerificationPage />} />
                <Route
                  path="/verificar-correo"
                  element={<ConfirmEmailPage />}
                />
                <Route path="/rutas" element={<RoutesPage />} />
                <Route path="/rutas/:slug" element={<RouteDetailPage />} />

                <Route element={<RequireRole roles={['TOURIST']} />}>
                  <Route element={<TouristLayout />}>
                    <Route path="/avisos" element={<NotificationsPage />} />
                    <Route path="/reservas" element={<MyBookingsPage />} />
                    <Route
                      path="/reservas/:id"
                      element={<BookingDetailPage />}
                    />
                    <Route
                      path="/reservas/:id/pagar"
                      element={<PaymentPage />}
                    />
                    <Route
                      path="/pagos/confirmar"
                      element={<PaymentReturnPage />}
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
                    <Route
                      path="rutas/:id"
                      element={<AdminRouteEditorPage />}
                    />
                    <Route path="usuarios" element={<AdminUsersPage />} />
                    <Route path="reservas" element={<AdminBookingsPage />} />
                    <Route
                      path="liquidaciones"
                      element={<AdminPayoutsPage />}
                    />
                    <Route path="resenas" element={<AdminReviewsPage />} />
                    <Route path="reglas" element={<AdminSettingsPage />} />
                    <Route path="avisos" element={<NotificationsPage />} />
                    <Route
                      path="*"
                      element={<Navigate to="/admin" replace />}
                    />
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
                              <ProviderSanctionsPage
                                load={getAgencySanctions}
                              />
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
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
