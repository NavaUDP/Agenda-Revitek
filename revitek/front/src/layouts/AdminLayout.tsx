import { useState } from "react";
import { Link, NavLink, Outlet} from 'react-router-dom';
import { Calendar, Users, Home } from 'lucide-react';

const initialEvents = [
  // --- CITAS (Appointments) ---
  { 
    id: '1',
    resourceId: 'a', // Corregido: 'd' minúscula
    title: 'Benja - Revisión Técnica', 
    start: '2025-09-15T09:00:00', 
    end: '2025-09-15T11:00:00',
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
    extendedProps: {
      type: 'appointment',
      client: 'Benja'
    }
  },
  {
    id: '2',
    resourceId: 'c',
    title: 'Jessica Sandoval - Lavado',
    start: '2025-09-15T11:00:00',
    end: '2025-09-15T13:00:00',
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
    extendedProps: {
      type: 'appointment',
      client: 'Jessica Sandoval'
    }
  },
  // --- HORARIOS BLOQUEADOS (Blocked Time) ---
  {
    id: '3',
    resourceId: 'd', // Bloqueo para Sergio Lobos
    title: 'Trabajo administrativo',
    start: '2025-09-15T11:00:00',
    end: '2025-09-15T13:00:00',
    display: 'background', // <-- Esto lo renderiza como un fondo
    backgroundColor: '#6b7280', // Un color gris para indicar bloqueo
    extendedProps: {
      type: 'blocked'
    }
  },
  {
    id: '4',
    resourceId: 'b', // Isaac Salomón
    title: 'Almuerzo',
    start: '2025-09-15T13:00:00',
    end: '2025-09-15T14:00:00',
    display: 'background',
    backgroundColor: '#6b7280',
    extendedProps: { type: 'blocked' }
  }

];

const initialResources = [
  { id: 'a', title: 'Felipe Cuevas'},
  { id: 'b', title: 'Isaac Salomón'},
  { id: 'c', title: 'Nicolas Isuani'},
  { id: 'd', title: 'Sergio Lobos'},
  { id: 'e', title: 'Benjamin Troncoso'}
];

export const AdminLayout = () => {
    const [resources, setResources] = useState(initialResources);
    const [events, setEvents] = useState(initialEvents);

    return (
        // --- NUEVO: Layout vertical ---
        <div className="flex flex-col h-screen bg-background">
            {/* --- HEADER SUPERIOR DE NAVEGACIÓN --- */}
            <header className="h-16 bg-card border-b border-border flex-shrink-0 flex items-center justify-between px-6 z-40">
                <div className="flex items-center space-x-6">
                    <h2 className="text-xl font-bold text-primary">Admin Panel</h2>
                    <nav className="flex items-center space-x-4">
                        <NavLink 
                            to="/admin/agenda"
                            className={({ isActive }) => 
                                `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                                }`
                            }
                        >
                            <Calendar className="h-4 w-4" />
                            <span>Agenda</span>
                        </NavLink>
                        <NavLink 
                            to="/admin/profesionales"
                            className={({ isActive }) => 
                                `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                                }`
                            }
                        >
                            <Users className="h-4 w-4" />
                            <span>Profesionales</span>
                        </NavLink>
                    </nav>
                </div>
                <div>
                    <Link to="/" className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                        <Home className="h-4 w-4" />
                        <span>Volver al Sitio</span>
                    </Link>
                </div>
            </header>

            {/* --- ÁREA DE CONTENIDO PRINCIPAL --- */}
            <main className="flex-1 h-full overflow-y-auto">
                {/* Outlet renderizará la página hija (Agenda o Profesionales) */}
                <Outlet context={{ resources, setResources, events, setEvents }} />
            </main>
        </div>
    );
};