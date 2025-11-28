// revitek/front/src/pages/AgendaPage.tsx
import FullCalendar from '@fullcalendar/react';
import { useEffect, useRef, useState } from 'react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useOutletContext } from 'react-router-dom';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import { AdminBookingModal, AdminBookingData } from '@/components/AdminBookingModal';
import { DateSelectArg, EventApi } from '@fullcalendar/core';
import { CalendarSidebar } from '../components/CalendarSidebar';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import {
  createReserva,
  ReservaPayload,
  createBlock,
  listBlocks,
  getReserva,
  listSlots,
} from '@/api/agenda';
import { toast } from "@/components/ui/use-toast";
import { ReservaDetailModal } from '@/components/ReservaDetailModal';
import { BlockDetailModal } from '@/components/BlockDetailModal';
import http from '@/api/http';

type AdminContextType = {
  resources: { id: string; title: string; eventColor?: string; eventBackgroundColor?: string; eventBorderColor?: string; }[];
  setResources: React.Dispatch<React.SetStateAction<{ id: string; title: string; eventColor?: string; eventBackgroundColor?: string; eventBorderColor?: string; }[]>>;
  events: any[];
  setEvents: React.Dispatch<React.SetStateAction<any[]>>;
  loading: boolean;
};

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
  const [selectedReservaId, setSelectedReservaId] = useState<number | null>(null);
  const [reservaDetail, setReservaDetail] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [availableServices, setAvailableServices] = useState<Array<{ id: number; nombre: string; duracion_min: number }>>([]);

  // Estados para modal de bloqueos
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [loadingBlock, setLoadingBlock] = useState(false);

  // ---------------------------
  // Cargar servicios disponibles al montar
  // ---------------------------
  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Backend expone /catalog/services/ (sin /api)
        const { data } = await http.get('/catalog/services/');
        setAvailableServices(
          data.map((s: any) => ({
            id: s.id,
            nombre: s.name,
            duracion_min: s.duration_min,
          }))
        );
      } catch (error) {
        console.error('Error loading services:', error);
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
  const handleEventClick = async (info: any) => {
    // Bloqueo
    if (info.event.extendedProps.type === 'blocked') {
      const blockId = info.event.extendedProps.blockId;
      if (!blockId) {
        console.error('ID de bloqueo inválido');
        return;
      }

      setIsBlockModalOpen(true);
      setLoadingBlock(true);

      try {
        const blocks = await listBlocks();
        const blockDetail = blocks.find((b: any) => b.id === blockId);

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
      const reservaId = parseInt(info.event.id, 10);
      if (isNaN(reservaId)) {
        console.error('ID de reserva inválido');
        return;
      }

      setSelectedReservaId(reservaId);
      setIsDetailModalOpen(true);
      setLoadingDetail(true);

      try {
        const detail = await getReserva(reservaId);
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
    try {
      window.location.reload();
    } catch (error) {
      console.error('Error refrescando calendario:', error);
    }
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
    if (!selectionInfo || !selectionInfo.resource) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay información de selección válida.",
      });
      setIsModalOpen(false);
      return;
    }

    setLocalLoading(true);

    try {
      const professionalId = parseInt(selectionInfo.resource.id, 10);
      if (isNaN(professionalId)) {
        throw new Error("ID de profesional inválido.");
      }

      // ---- BLOQUEO ----
      if (data.type === 'blocked') {
        if (data.aplicar_a_rango && data.fecha_fin) {
          // Bloqueo en rango de días
          const fechaInicio = new Date(data.fecha);
          const fechaFin = new Date(data.fecha_fin);
          const bloqueosCreados: any[] = [];

          for (
            let currentDate = new Date(fechaInicio);
            currentDate <= fechaFin;
            currentDate.setDate(currentDate.getDate() + 1)
          ) {
            const fechaStr = currentDate.toISOString().split('T')[0];
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

              const newBlockedEvent = {
                id: `block_${blockResponse.id}`,
                title: `🚫 ${data.razonBloqueo || 'Bloqueado'}`,
                start: inicioISO,
                end: finISO,
                resourceId: selectionInfo.resource.id,
                backgroundColor: '#ef4444',
                borderColor: '#dc2626',
                extendedProps: {
                  type: 'blocked',
                  blockId: blockResponse.id,
                  razon: data.razonBloqueo,
                },
              };
              setEvents(prevEvents => [...prevEvents, newBlockedEvent]);
            } catch (error) {
              console.error(`Error bloqueando fecha ${fechaStr}:`, error);
            }
          }

          const diasBloqueados = bloqueosCreados.length;
          toast({
            title: "Horarios Bloqueados",
            description: `${diasBloqueados} día${diasBloqueados !== 1 ? 's' : ''} bloqueado${diasBloqueados !== 1 ? 's' : ''} exitosamente (${new Date(data.fecha).toLocaleDateString('es-CL')} - ${new Date(data.fecha_fin).toLocaleDateString('es-CL')})`,
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

          toast({
            title: "Horario Bloqueado",
            description: `Bloqueo creado exitosamente.`,
          });

          const newBlockedEvent = {
            id: `block_${blockResponse.id}`,
            title: `🚫 ${data.razonBloqueo || 'Bloqueado'}`,
            start: inicioISO,
            end: finISO,
            resourceId: selectionInfo.resource.id,
            backgroundColor: '#ef4444',
            borderColor: '#dc2626',
            extendedProps: {
              type: 'blocked',
              blockId: blockResponse.id,
              razon: data.razonBloqueo,
            },
          };
          setEvents(prevEvents => [...prevEvents, newBlockedEvent]);
        }

      } else {
        // ---- RESERVA ----
        if (!data.servicios || data.servicios.length === 0) {
          throw new Error("Debes seleccionar al menos un servicio.");
        }

        // Construir inicio/fin ISO
        const inicioISO = `${data.fecha}T${data.hora_inicio}:00`;
        const finISO = `${data.fecha}T${data.hora_fin}:00`;

        // Buscar slot que coincide con el inicio seleccionado
        const startTime = new Date(inicioISO);
        const slotId = await findMatchingSlotId(professionalId, startTime);

        if (!slotId) {
          throw new Error(
            `No se encontró un slot disponible para ${selectionInfo.resource.title} en el horario seleccionado.`
          );
        }

        // Mapear AdminBookingData → ReservaPayload del backend nuevo
        const payload: ReservaPayload = {
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
          // Address: por ahora la dejamos fuera porque el backend espera commune_id (entero).
          // Si luego conectas con catálogo de comunas, aquí se mapea.
          services: data.servicios.map((sid) => ({
            service_id: sid,
            professional_id: professionalId,
          })),
          slot_id: slotId,
          note: data.nota || '',
        };

        const nuevaReserva = await createReserva(payload);

        const newEvent = {
          id: String(nuevaReserva.id),
          title: `${data.cliente?.nombre} ${data.cliente?.apellido}`,
          start: inicioISO,
          end: finISO,
          resourceId: selectionInfo.resource.id,
          backgroundColor: resources.find(r => r.id === selectionInfo.resource?.id)?.eventBackgroundColor || '#3b82f6',
          borderColor: resources.find(r => r.id === selectionInfo.resource?.id)?.eventBorderColor || '#3b82f6',
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
      }

    } catch (error: any) {
      console.error("Error en operación:", error);
      const errorMsg = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      toast({
        variant: "destructive",
        title: data.type === 'blocked' ? "Error al bloquear" : "Error al crear cita",
        description: errorMsg,
      });
    } finally {
      setLocalLoading(false);
      setIsModalOpen(false);
    }
  };

  // ---------------------------
  // Buscar slot que coincide con fecha/hora
  // ---------------------------
  async function findMatchingSlotId(profId: number, startTime: Date): Promise<number | null> {
    try {
      const fecha = startTime.toISOString().split('T')[0];
      const slots = await listSlots({ professionalId: profId, date: fecha });

      const matchingSlot = (slots || []).find((slot: any) => {
        const slotStart = new Date(slot.start);
        const diff = Math.abs(slotStart.getTime() - startTime.getTime());
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
        className={`transition-all duration-300 ease-in-out bg-card border-r border-border flex-shrink-0 overflow-hidden ${isSidebarOpen ? 'w-72' : 'w-0'
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
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 z-30 bg-card hover:bg-muted"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

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
