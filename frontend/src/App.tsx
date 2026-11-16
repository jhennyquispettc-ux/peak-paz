import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import LoginPage from './pages/LoginPage';
import RouteDetailPage from './pages/RouteDetailPage';
import RoutesPage from './pages/RoutesPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/rutas" replace />} />
          <Route path="/ingresar" element={<LoginPage mode="login" />} />
          <Route path="/registro" element={<LoginPage mode="register" />} />
          <Route path="/rutas" element={<RoutesPage />} />
          <Route path="/rutas/:slug" element={<RouteDetailPage />} />
          <Route path="*" element={<Navigate to="/rutas" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
