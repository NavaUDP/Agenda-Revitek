// revitek/front/src/pages/AgendaPage.tsx
import FullCalendar from '@fullcalendar/react';
import { useEffect, useRef, useState, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useOutletContext } from 'react-router-dom';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import { AdminBookingModal, AdminBookingData } from '@/components/AdminBookingModal';
import { DateSelectArg, EventApi, EventClickArg } from '@fullcalendar/core';
import { CalendarSidebar } from '../components/CalendarSidebar';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import {
  createReservation,
  ReservationPayload,
  createBlock,
  listBlocks,
  getReservation,
  listSlots,
  ReservationDetailed,
  SlotBlockData,
} from '@/api/agenda';
import { listAllServices } from '@/api/servicios';
import { toast } from "@/components/ui/use-toast";
import { ReservaDetailModal } from '@/components/ReservaDetailModal';
import { BlockDetailModal } from '@/components/BlockDetailModal';
import { format, addDays, parseISO, differenceInMilliseconds } from 'date-fns';

// Strict types for Context
type AdminContextType = {
  resources: { id: string; title: string; eventColor?: string; eventBackgroundColor?: string; eventBorderColor?: string; }[];
  setResources: React.Dispatch<React.SetStateAction<{ id: string; title: string; eventColor?: string; eventBackgroundColor?: string; eventBorderColor?: string; }[]>>;
  events: any[]; // Ideally this should be a union of ReservationEvent | BlockEvent
  setEvents: React.Dispatch<React.SetStateAction<any[]>>;
  loading: boolean;
};

interface ServiceOption {
  id: number;
  nombre: string;
  duracion_min: number;
}

const AgendaPage = () => {
  const context = useOutletContext<AdminContextType>();
  const { resources, events, setEvents, loading: initialLoading } = context;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectionInfo, setSelectionInfo] = useState<DateSelectArg | null>(null);
  const mainCalendarRef = useRef<FullCalendar>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  // RBAC: Restrict view for professionals
  const auth = useContext(AuthContext);
  const user = auth?.user;
  const isProfessional = !user?.is_staff && !!user?.professional_id;

  useEffect(() => {
    if (isProfessional && user?.professional_id) {
      setSelectedProfessionalId(String(user.professional_id));
      // Force view to week view or day view as preferred
      const calendarApi = mainCalendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi.changeView('timeGridWeek');
      }
    }
  }, [isProfessional, user, resources]);

  const [selectedReservaId, setSelectedReservaId] = useState<number | null>(null);
  const [reservaDetail, setReservaDetail] = useState<ReservationDetailed | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [availableServices, setAvailableServices] = useState<ServiceOption[]>([]);

  // Estados para modal de bloqueos
  const [selectedBlock, setSelectedBlock] = useState<SlotBlockData | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [loadingBlock, setLoadingBlock] = useState(false);

  // ---------------------------
  // Cargar servicios disponibles al montar
  // ---------------------------
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const services = await listAllServices();
        setAvailableServices(
          services.map((s) => ({
            id: s.id,
            nombre: s.name,
            duracion_min: s.duration_min,
          }))
        );
      } catch (error) {
        console.error('Error loading services:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los servicios.",
        });
      }
    };
    fetchServices();
  }, []);

  // Ajustar tamaño del calendario al abrir/cerrar sidebar
  useEffect(() => {
    const timer = setTimeout(() => {
      const calendarApi = mainCalendarRef.current?.getApi();
      if (calendarApi) {
        calendarApi.updateSize();
      }
    }, 310);
    return () => clearTimeout(timer);
  }, [isSidebarOpen]);

  // ---------------------------
  // CLICK EN EVENTO (reserva o bloqueo)
  // ---------------------------
  const handleEventClick = async (info: EventClickArg) => {
    const { extendedProps, id } = info.event;

    // Bloqueo
    if (extendedProps.type === 'blocked') {
      const blockId = extendedProps.blockId;
      if (!blockId) {
        console.error('ID de bloqueo inválido');
        return;
      }

      setIsBlockModalOpen(true);
      setLoadingBlock(true);

      try {
        const blocks = await listBlocks();
        const blockDetail = blocks.find((b) => b.id === blockId);

        if (blockDetail) {
          setSelectedBlock(blockDetail);
        } else {
          throw new Error('Bloqueo no encontrado');
        }
      } catch (error) {
        console.error('Error al cargar detalle de bloqueo:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar el detalle del bloqueo.",
        });
        setIsBlockModalOpen(false);
      } finally {
        setLoadingBlock(false);
      }
    } else {
      // Reserva
      const reservaId = parseInt(id, 10);
      if (isNaN(reservaId)) {
        console.error('ID de reserva inválido');
        return;
      }

      setSelectedReservaId(reservaId);
      setIsDetailModalOpen(true);
      setLoadingDetail(true);

      try {
        const detail = await getReservation(reservaId);
        setReservaDetail(detail);
      } catch (error) {
        console.error('Error al cargar detalle de reserva:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar el detalle de la reserva.",
        });
        setIsDetailModalOpen(false);
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setReservaDetail(null);
    setSelectedReservaId(null);
  };

  const handleCloseBlockModal = () => {
    setIsBlockModalOpen(false);
    setSelectedBlock(null);
  };

  const handleRefreshCalendar = async () => {
    // Ideally, we should trigger a refetch in the parent context
    // For now, we can just reload the page as a fallback if context doesn't support refresh
    // Or better, we can just rely on the fact that modals update the state?
    // The previous implementation used window.location.reload(), which is heavy-handed.
    // Let's try to avoid it if possible, but since `events` come from context, we might need to reload to be safe.
    // A better approach would be to expose a refresh function in context.
    // For this refactor, I will keep reload but wrap it in a try-catch to be safe, 
    // or if I can, I'd suggest adding a refresh capability to the context in a future step.
    window.location.reload();
  };

  const handleDateSelectSidebar = (date: Date) => {
    setCurrentDate(date);
    const calendarApi = mainCalendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.gotoDate(date);
    }
  };

  const handleProfessionalSelect = (professionalId: string | null) => {
    setSelectedProfessionalId(professionalId);
    const calendarApi = mainCalendarRef.current?.getApi();
    if (calendarApi) {
      if (professionalId) {
        // Vista semanal para un profesional
        calendarApi.changeView('timeGridWeek');
      } else {
        // Vista diaria por recursos
        calendarApi.changeView('resourceTimeGridDay');
      }
    }
  };

  // ---------------------------
  // CONFIRMAR CITA O BLOQUEO
  // ---------------------------
  const handleConfirmAppointment = async (data: AdminBookingData) => {
    if (!selectionInfo) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay información de selección válida.",
      });
      setIsModalOpen(false);
      return;
    }

    // Determinar el ID del profesional:
    // 1. Si hay resource (vista resourceTimeGridDay), usar el resource.id
    // 2. Si no hay resource pero hay selectedProfessionalId (vista timeGridWeek), usar ese
    let professionalId: number;
    let resourceId: string;

    if (selectionInfo.resource) {
      professionalId = parseInt(selectionInfo.resource.id, 10);
      resourceId = selectionInfo.resource.id;
    } else if (selectedProfessionalId) {
      professionalId = parseInt(selectedProfessionalId, 10);
      resourceId = selectedProfessionalId;
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se ha seleccionado un profesional. Por favor, selecciona un profesional en el panel lateral.",
      });
      setIsModalOpen(false);
      return;
    }

    if (isNaN(professionalId)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "ID de profesional inválido.",
      });
      setIsModalOpen(false);
      return;
    }

    setLocalLoading(true);

    try {
      if (data.type === 'blocked') {
        await handleCreateBlock(data, professionalId, resourceId);
      } else {
        await handleCreateReservation(data, professionalId, resourceId);
      }

    } catch (error: any) {
      console.error("Error en operación:", error);
      const errorMsg = error?.response?.data?.detail || error?.message || "Error desconocido";
      toast({
        variant: "destructive",
        title: data.type === 'blocked' ? "Error al bloquear" : "Error al crear cita",
        description: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
      });
    } finally {
      setLocalLoading(false);
      setIsModalOpen(false);
    }
  };

  const handleCreateBlock = async (data: AdminBookingData, professionalId: number, resourceId: string) => {
    if (data.aplicar_a_rango && data.fecha_fin) {
      // Bloqueo en rango de días
      const fechaInicio = new Date(data.fecha);
      const fechaFin = new Date(data.fecha_fin);
      const bloqueosCreados: SlotBlockData[] = [];

      let currentDateIter = fechaInicio;
      while (currentDateIter <= fechaFin) {
        const fechaStr = format(currentDateIter, 'yyyy-MM-dd');
        const inicioISO = `${fechaStr}T${data.hora_inicio}:00`;
        const finISO = `${fechaStr}T${data.hora_fin}:00`;

        try {
          const blockResponse = await createBlock({
            professional: professionalId,
            date: fechaStr,
            start: inicioISO,
            end: finISO,
            reason: data.razonBloqueo,
          });

          bloqueosCreados.push(blockResponse);
          addBlockEventToCalendar(blockResponse, resourceId, data.razonBloqueo, inicioISO, finISO);
        } catch (error) {
          console.error(`Error bloqueando fecha ${fechaStr}:`, error);
        }
        currentDateIter = addDays(currentDateIter, 1);
      }

      const diasBloqueados = bloqueosCreados.length;
      toast({
        title: "Horarios Bloqueados",
        description: `${diasBloqueados} día(s) bloqueado(s) exitosamente.`,
      });

    } else {
      // Bloqueo en un solo día
      const inicioISO = `${data.fecha}T${data.hora_inicio}:00`;
      const finISO = `${data.fecha}T${data.hora_fin}:00`;

      const blockResponse = await createBlock({
        professional: professionalId,
        date: data.fecha,
        start: inicioISO,
        end: finISO,
        reason: data.razonBloqueo,
      });

      addBlockEventToCalendar(blockResponse, resourceId, data.razonBloqueo, inicioISO, finISO);

      toast({
        title: "Horario Bloqueado",
        description: `Bloqueo creado exitosamente.`,
      });
    }
  };

  const addBlockEventToCalendar = (block: SlotBlockData, resourceId: string, reason: string | undefined, start: string, end: string) => {
    const newBlockedEvent = {
      id: `block_${block.id}`,
      title: `🚫 ${reason || 'Bloqueado'}`,
      start: start,
      end: end,
      resourceId: resourceId,
      backgroundColor: '#ef4444',
      borderColor: '#dc2626',
      extendedProps: {
        type: 'blocked',
        blockId: block.id,
        razon: reason,
      },
    };
    setEvents(prevEvents => [...prevEvents, newBlockedEvent]);
  };

  const handleCreateReservation = async (data: AdminBookingData, professionalId: number, resourceId: string) => {
    if (!data.servicios || data.servicios.length === 0) {
      throw new Error("Debes seleccionar al menos un servicio.");
    }

    // Construir inicio/fin ISO
    const inicioISO = `${data.fecha}T${data.hora_inicio}:00`;
    const finISO = `${data.fecha}T${data.hora_fin}:00`;

    // Buscar slot que coincide con el inicio seleccionado
    const startTime = parseISO(inicioISO);
    const slotId = await findMatchingSlotId(professionalId, startTime);

    if (!slotId) {
      const professionalName = resources.find(r => r.id === resourceId)?.title || `Profesional #${professionalId}`;
      throw new Error(
        `No se encontró un slot disponible para ${professionalName} en el horario seleccionado.`
      );
    }

    // Mapear AdminBookingData → ReservaPayload del backend nuevo
    const payload: ReservationPayload = {
      professional_id: professionalId,
      client: {
        first_name: data.cliente!.nombre,
        last_name: data.cliente!.apellido,
        email: data.cliente!.email,
        phone: data.cliente!.telefono,
      },
      vehicle: data.vehiculo
        ? {
          license_plate: data.vehiculo.patente,
          brand: data.vehiculo.marca,
          model: data.vehiculo.modelo,
          year: data.vehiculo.year,
        }
        : undefined,
      services: data.servicios.map((sid) => ({
        service_id: sid,
        professional_id: professionalId,
      })),
      slot_id: slotId,
      note: data.nota || '',
    };

    const nuevaReserva = await createReservation(payload);

    const newEvent = {
      id: String(nuevaReserva.id),
      title: `${data.cliente?.nombre} ${data.cliente?.apellido}`,
      start: inicioISO,
      end: finISO,
      resourceId: resourceId,
      backgroundColor: resources.find(r => r.id === resourceId)?.eventBackgroundColor || '#3b82f6',
      borderColor: resources.find(r => r.id === resourceId)?.eventBorderColor || '#3b82f6',
      extendedProps: {
        type: 'appointment',
        client: `${data.cliente?.nombre} ${data.cliente?.apellido}`,
        reservaId: nuevaReserva.id,
      },
    };
    setEvents(prevEvents => [...prevEvents, newEvent]);
    toast({
      title: "Cita Creada",
      description: `Reserva #${nuevaReserva.id} creada exitosamente.`,
    });
  };

  // ---------------------------
  // Buscar slot que coincide con fecha/hora
  // ---------------------------
  async function findMatchingSlotId(profId: number, startTime: Date): Promise<number | null> {
    try {
      const fecha = format(startTime, 'yyyy-MM-dd');
      const slots = await listSlots({ professionalId: profId, date: fecha });

      const matchingSlot = (slots || []).find((slot) => {
        const slotStart = parseISO(slot.start); // Assuming slot.start is ISO string
        // Use date-fns difference
        const diff = Math.abs(differenceInMilliseconds(slotStart, startTime));
        return diff < 60000 && slot.status === 'AVAILABLE';
      });

      return matchingSlot ? matchingSlot.id : null;
    } catch (error) {
      console.error('Error finding slot:', error);
      return null;
    }
  }

  // Filtrar eventos según profesional seleccionado
  const filteredEvents = selectedProfessionalId
    ? events.filter(event => event.resourceId === selectedProfessionalId)
    : events;

  // Filtrar recursos según profesional seleccionado
  const filteredResources = selectedProfessionalId
    ? resources.filter(resource => resource.id === selectedProfessionalId)
    : resources;

  return (
    <div className="flex h-[calc(100vh-4rem)] admin-calendar">
      <aside
        className={`transition-all duration-300 ease-in-out bg-card border-r border-border flex-shrink-0 overflow-hidden ${isSidebarOpen && !isProfessional ? 'w-72' : 'w-0'
          }`}
      >
        <div className="w-72 h-full">
          <CalendarSidebar
            onDateSelect={handleDateSelectSidebar}
            resources={resources}
            selectedProfessionalId={selectedProfessionalId}
            onProfessionalSelect={handleProfessionalSelect}
          />
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-6 h-full overflow-y-auto relative bg-background">
        {!isProfessional && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 z-30 bg-card hover:bg-muted"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        )}

        <div className="bg-card p-2 sm:p-4 rounded-lg shadow-sm h-full mt-10 md:mt-0">
          {initialLoading && <p className="text-center p-10">Cargando profesionales...</p>}
          {!initialLoading && (
            <FullCalendar
              ref={mainCalendarRef}
              plugins={[resourceTimeGridPlugin, dayGridPlugin, timeGridPlugin, interactionPlugin]}
              schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: selectedProfessionalId ? '' : 'dayGridMonth',
              }}
              initialView="resourceTimeGridDay"
              initialDate={currentDate}
              locale={esLocale}
              firstDay={1}
              slotMinTime="08:00:00"
              slotMaxTime="19:00:00"
              allDaySlot={false}
              resources={filteredResources}
              events={filteredEvents}
              selectable={true}
              editable={true}
              eventStartEditable={false}
              eventDurationEditable={false}
              selectOverlap={(event: EventApi) => event.extendedProps.type !== 'blocked'}
              eventClick={handleEventClick}
              select={(info) => {
                setSelectionInfo(info);
                setIsModalOpen(true);
                info.view.calendar.unselect();
              }}
              height="100%"
              stickyHeaderDates={true}
              nowIndicator={true}
            />
          )}
        </div>
      </main>

      <AdminBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmAppointment}
        selectionInfo={selectionInfo}
        availableServices={availableServices}
      />

      {isDetailModalOpen && (
        loadingDetail ? (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg">
              <p className="text-foreground">Cargando detalle...</p>
            </div>
          </div>
        ) : (
          <ReservaDetailModal
            isOpen={isDetailModalOpen}
            onClose={handleCloseDetailModal}
            reserva={reservaDetail}
            onRefreshCalendar={handleRefreshCalendar}
          />
        )
      )}

      {isBlockModalOpen && (
        loadingBlock ? (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg">
              <p className="text-foreground">Cargando bloqueo...</p>
            </div>
          </div>
        ) : (
          <BlockDetailModal
            isOpen={isBlockModalOpen}
            onClose={handleCloseBlockModal}
            block={selectedBlock}
            onRefreshCalendar={handleRefreshCalendar}
          />
        )
      )}
    </div>
  );
};

export default AgendaPage;
