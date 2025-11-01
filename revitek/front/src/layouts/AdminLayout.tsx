import { useState, useEffect } from "react"; // Añade useEffect
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Calendar, Users, Home, Wrench, UsersRound } from 'lucide-react';
import { listProfesionales } from '@/api/profesionales';
import { listReservas, ReservaDetallada } from "@/api/agenda";
import { toast } from "@/components/ui/use-toast";

type CalendarResource = {
  id: string;
  title: string;
};

type CalendarEvent = {
    id: string;
    resourceId: string;
    title: string;
    start: string;
    end: string;
    backgroundColor: string;
    borderColor: string;
    extendedProps: {
        type: 'appointment' | 'blocked';
        client: string;
        reservaId: number;
    };
};

function transformReservasToEvents(reservas: ReservaDetallada[]): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    
    for (const reserva of reservas) {
        // Solo procesamos reservas que tengan slots válidos
        if (!reserva.reservaslot || !reserva.reservaslot.inicio || !reserva.reservaslot.fin || !reserva.reservaslot.profesional_id) {
            continue;
        }

        // Determinar título y color
        let title = reserva.cliente?.nombre || 'Cliente Anónimo';
        let backgroundColor = '#3b82f6'; // Azul por defecto
        let borderColor = '#2563eb';

        if (reserva.estado === 'CANCELADO') {
            title = `(CANCELADO) ${title}`;
            backgroundColor = '#6b7280'; // Gris
            borderColor = '#4b5563';
        }

        events.push({
            id: String(reserva.id),
            resourceId: String(reserva.reservaslot.profesional_id),
            title: title,
            start: reserva.reservaslot.inicio,
            end: reserva.reservaslot.fin,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            extendedProps: {
                type: 'appointment',
                client: reserva.cliente?.nombre || 'Cliente Anónimo',
                reservaId: reserva.id
            }
        });
    }
    return events;
}

export const AdminLayout = () => {
    const [resources, setResources] = useState<CalendarResource[]>([]);
    // --- 5. Inicializar 'events' como un array vacío ---
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        
        // --- 6. Cargar Profesionales (Recursos) y Reservas (Eventos) en paralelo ---
        Promise.all([
            listProfesionales(),
            listReservas()
        ])
        .then(([profData, reservaData]) => {
            
            // Procesar Profesionales
            const formattedResources: CalendarResource[] = profData.map(prof => ({
                id: String(prof.id),
                title: prof.nombre
            }));
            setResources(formattedResources);

            // Procesar Reservas
            const formattedEvents = transformReservasToEvents(reservaData);
            setEvents(formattedEvents);

        })
        .catch(error => {
            console.error("Error fetching admin data:", error);
            toast({
                variant: "destructive",
                title: "Error de Carga",
                description: "No se pudieron cargar los profesionales o las reservas."
            })
        })
        .finally(() => setLoading(false));

    }, []); // El array vacío asegura que se ejecute solo una vez

    const contextValue = { resources, setResources, events, setEvents, loading };

    return (
        // --- (El JSX de AdminLayout no cambia) ---
        <div className="flex flex-col h-screen bg-background">
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

                        <NavLink
                            to="/admin/servicios"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                                }`
                            }
                        >
                            <Wrench className="h-4 w-4" />
                            <span>Servicios</span>
                        </NavLink>

                        <NavLink
                            to="/admin/asignaciones"
                            className={({ isActive }) =>
                                `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                                }`
                            }
                        >
                            <UsersRound className="h-4 w-4" />
                            <span>Asignaciones</span>
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

            <main className="flex-1 h-full overflow-y-auto">
                 <Outlet context={contextValue} />
            </main>
        </div>
    );
};