import { useState, useEffect } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Calendar, Users, Home, Wrench, UsersRound, Menu } from "lucide-react";

import { listProfesionales } from "@/api/profesionales";
import { listReservas, ReservaDetallada } from "@/api/agenda";
import { toast } from "@/components/ui/use-toast";
import http from "@/api/http";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type CalendarResource = {
  id: string;
  title: string;
  eventColor?: string;
  eventBackgroundColor?: string;
  eventBorderColor?: string;
};

type CalendarEvent = {
  id: string;
  resourceId: string;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  display?: "background" | "auto" | "block";
  extendedProps: {
    type: "appointment" | "blocked";
    client?: string;
    reservaId?: number;   // para eventos de reserva
    blockId?: number;     // para bloqueos
    reason?: string;      // para bloqueos
    status?: string;      // estado de la reserva
  };
};

/* ---------------------------------------------------------
   TRANSFORM RESERVAS → FULLCALENDAR EVENTS
   Usa los campos que devuelve ReservationDetailSerializer:
   - status
   - client_info { first_name, last_name, phone, email }
   - slots_summary { start, end, professional_id }
--------------------------------------------------------- */
function transformReservasToEvents(
  reservas: ReservaDetallada[],
  colorMap: Record<string, string>
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const reserva of reservas) {
    const slots = reserva.slots_summary;
    if (!slots) continue;

    const firstName = reserva.client_info?.first_name || "Cliente";
    const lastName = reserva.client_info?.last_name || "";
    const title = `${firstName} ${lastName}`.trim();

    const isCancelled = reserva.status === "CANCELLED";
    const isPending = reserva.status === "PENDING";
    const profId = String(slots.professional_id);
    const profColor = colorMap[profId] || "#3b82f6"; // Fallback blue

    let eventTitle = title;
    if (isCancelled) eventTitle = `(CANCELADA) ${title}`;
    else if (isPending) eventTitle = `⏳ ${title}`;

    events.push({
      id: String(reserva.id),
      resourceId: profId,
      title: eventTitle,
      start: slots.start,
      end: slots.end,
      // Explicitly set color. Grey if cancelled, else professional color.
      // If pending, use slightly transparent color or same color.
      backgroundColor: isCancelled ? "#6b7280" : (isPending ? `${profColor}CC` : profColor), // CC = 80% opacity
      borderColor: isCancelled ? "#4b5563" : (isPending ? "#f59e0b" : profColor), // Amber border for pending
      extendedProps: {
        type: "appointment",
        client: title,
        reservaId: reserva.id,
        status: reserva.status, // Pass status to extendedProps
      },
    });
  }

  return events;
}

/* ---------------------------------------------------------
   LOAD BLOCKED SLOTS (SlotBlock)
   Usa el endpoint /agenda/blocks/
--------------------------------------------------------- */
async function loadBlockedSlots(): Promise<CalendarEvent[]> {
  try {
    const { data } = await http.get('/agenda/blocks/');

    return data.map((block: any) => ({
      id: `block_${block.id}`,
      resourceId: String(block.professional),
      title: `🚫 ${block.reason || 'Bloqueo'}`,
      start: block.start,
      end: block.end,
      backgroundColor: '#ef4444',
      borderColor: '#dc2626',
      display: 'block',   // 👈 IMPORTANTE: muestra texto
      extendedProps: {
        type: 'blocked',
        blockId: block.id,   // 👈 NECESARIO para abrir el modal
        reason: block.reason
      }
    }));
  } catch (error) {
    console.error('Error loading blocked slots:', error);
    return [];
  }
}

export const AdminLayout = () => {
  const [resources, setResources] = useState<CalendarResource[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // ... (useEffect logic remains unchanged)
    setLoading(true);

    Promise.all([
      listProfesionales(), // GET /agenda/professionals/
      listReservas(), // GET /agenda/reservations/
      loadBlockedSlots(), // GET /agenda/blocks/
    ])
      .then(([profData, reservasData, blockedData]) => {
        // ... (logic remains unchanged)
        const colorMap: Record<string, string> = {};
        profData.forEach((p: any) => {
          colorMap[String(p.id)] = p.calendar_color || "#3b82f6";
        });

        setResources(
          profData.map((p: any) => ({
            id: String(p.id),
            title: `${p.first_name} ${p.last_name}`.trim(),
            eventColor: p.calendar_color || '#3b82f6',
            eventBackgroundColor: p.calendar_color || '#3b82f6',
            eventBorderColor: p.calendar_color || '#3b82f6',
          }))
        );

        const reservationEvents = transformReservasToEvents(reservasData, colorMap);
        const allEvents = [...reservationEvents, ...blockedData];
        setEvents(allEvents);
      })
      .catch((error) => {
        console.error("Error fetching admin data:", error);
        toast({
          variant: "destructive",
          title: "Error de Carga",
          description: "No se pudieron cargar profesionales o reservas.",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const contextValue = { resources, setResources, events, setEvents, loading };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <NavLink
        to="/admin/agenda"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
          }`
        }
      >
        <Calendar className="h-4 w-4" />
        <span>Agenda</span>
      </NavLink>

      <NavLink
        to="/admin/profesionales"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
          }`
        }
      >
        <Users className="h-4 w-4" />
        <span>Profesionales</span>
      </NavLink>

      <NavLink
        to="/admin/servicios"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
          }`
        }
      >
        <Wrench className="h-4 w-4" />
        <span>Servicios</span>
      </NavLink>

      <NavLink
        to="/admin/asignaciones"
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
          }`
        }
      >
        <UsersRound className="h-4 w-4" />
        <span>Asignaciones</span>
      </NavLink>
    </>
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="h-16 bg-card border-b border-border flex-shrink-0 flex items-center justify-between px-4 md:px-6 z-40">
        <div className="flex items-center space-x-4 md:space-x-6">
          {/* Mobile Menu Trigger */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[300px]">
              <div className="flex flex-col space-y-4 mt-6">
                <NavLinks mobile />
                <div className="border-t border-border pt-4">
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    <span>Volver al Sitio</span>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <h2 className="text-xl font-bold text-primary">Admin Panel</h2>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-4">
            <NavLinks />
          </nav>
        </div>

        <div className="hidden md:block">
          <Link
            to="/"
            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
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
