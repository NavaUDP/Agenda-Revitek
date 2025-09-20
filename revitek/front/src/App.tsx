import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importación de Layouts y Páginas
import PublicLayout from './layouts/PublicLayout'; // <-- NUEVO
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './routes/ProtectedRoute';
import ClientBookingPage from './pages/ClientBookingPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- GRUPO DE RUTAS PÚBLICAS --- */}
        {/* Todas las rutas anidadas aquí usarán el diseño de PublicLayout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          {/* Si tuvieras otras páginas públicas como /nosotros o /servicios, irían aquí */}
          {/* <Route path="/nosotros" element={<AboutPage />} /> */}
        </Route>

        {/* --- NUEVA RUTA DE AGENDAMIENTO PARA CLIENTES --- */}
        <Route path="/agendar" element={<ClientBookingPage />} />

        {/* --- RUTAS INDEPENDIENTES --- */}
        {/* Estas rutas no usan el PublicLayout (no tienen Header ni Footer) */}
        <Route path="/login" element={<LoginPage />} />

        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              {/* Esta ruta está protegida y tampoco usa el layout público.
                  Podríamos crear un "AdminLayout" si quisiéramos una barra lateral, etc. */}
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;