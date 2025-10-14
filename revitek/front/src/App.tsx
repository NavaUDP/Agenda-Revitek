import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importación de Layouts y Páginas
import PublicLayout from './layouts/PublicLayout'; 
import LandingPage from './pages/LandingPage';
import ServiciosPage from './pages/ServiciosPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AgendaPage';
import ProtectedRoute from './routes/ProtectedRoute';
import ClientBookingPage from './pages/ClientBookingPage';
import { AdminLayout } from './layouts/AdminLayout';
import ProfessionalsPage from './pages/ProfessionalsPage';
import AgendaPage from './pages/AgendaPage';

function App() {
  return (
    <BrowserRouter>
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
          {/* Ruta por defecto para /admin -> redirige a la agenda */}
          <Route index element={<Navigate to="agenda" replace />} /> 
          
          {/* Rutas anidadas que se renderizarán dentro del <Outlet> de AdminLayout */}
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="profesionales" element={<ProfessionalsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;