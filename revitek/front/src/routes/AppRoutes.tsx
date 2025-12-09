import { Routes, Route, Navigate } from 'react-router-dom';

// Importación de Layouts y Páginas
import PublicLayout from '../layouts/PublicLayout';
import LandingPage from '../pages/LandingPage';
import ServiciosPage from '../pages/ServiciosPage';
import { LoginPage } from '../pages/LoginPage';
import AdminDashboard from '../pages/AgendaPage';
import DashboardPage from '../pages/DashboardPage';
import { ProtectedRoute } from './ProtectedRoute';
import ClientBookingPage from '../pages/ClientBookingPage';
import { AdminLayout } from '../layouts/AdminLayout';
import ProfessionalsPage from '../pages/ProfessionalsPage';
import AgendaPage from '../pages/AgendaPage';
import AdminServicesPage from '../pages/AdminServicesPage'
import AdminAssignmentsPage from '../pages/AdminAssignmentsPage';
import ProfessionalEditPage from '../pages/ProfessionalEditPage';
import ConfirmReservationPage from '../pages/ConfirmReservationPage';
import ReservationsPage from '../pages/ReservationsPage';
import NotFound from '../pages/NotFound';

export function AppRoutes() {
  return (
    <Routes>
      {/* --- GRUPO DE RUTAS PÚBLICAS --- */}
      {/* Todas las rutas anidadas aquí usarán el diseño de PublicLayout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/servicios" element={<ServiciosPage />} />
        {/* Si tuvieras otras páginas públicas como /nosotros o /servicios, irían aquí */}
        {/* <Route path="/nosotros" element={<AboutPage />} /> */}
      </Route>

      {/* --- NUEVA RUTA DE AGENDAMIENTO PARA CLIENTES --- */}
      <Route path="/agendar" element={<ClientBookingPage />} />

      {/* --- RUTA PÚBLICA DE CONFIRMACIÓN VÍA WHATSAPP --- */}
      <Route path="/confirmar/:token" element={<ConfirmReservationPage />} />

      {/* --- RUTAS INDEPENDIENTES --- */}
      {/* Estas rutas no usan el PublicLayout (no tienen Header ni Footer) */}
      <Route path="/login" element={<LoginPage />} />

      {/* ---  NUEVO: GRUPO DE RUTAS DE ADMINISTRADOR --- */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* Ruta por defecto para /admin -> Dashboard */}
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="profesionales" element={<ProfessionalsPage />} />
        <Route path="profesionales/:id" element={<ProfessionalEditPage />} />
        <Route path="servicios" element={<AdminServicesPage />} />
        <Route path="asignaciones" element={<AdminAssignmentsPage />} />
        <Route path="reservas" element={<ReservationsPage />} />
      </Route>

      {/* --- RUTA PARA PÁGINAS NO ENCONTRADAS --- */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
