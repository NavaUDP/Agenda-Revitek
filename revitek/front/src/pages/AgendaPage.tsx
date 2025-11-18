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
import { createReserva, ReservaPayload, createBlock, updateBlock, deleteBlock } from '@/api/agenda';
import { toast } from "@/components/ui/use-toast";
import { ReservaDetailModal } from '@/components/ReservaDetailModal';
import { getReserva } from '@/api/agenda';
import http from '@/api/http';

type AdminContextType = {
    resources: { id: string; title: string; }[];
    setResources: React.Dispatch<React.SetStateAction<{ id: string; title: string; }[]>>;
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [localLoading, setLocalLoading] = useState(false);
    const [selectedReservaId, setSelectedReservaId] = useState<number | null>(null);
    const [reservaDetail, setReservaDetail] = useState<any>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [availableServices, setAvailableServices] = useState<Array<{ id: number; nombre: string; duracion_min: number }>>([]);

    // Cargar servicios disponibles al montar
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const { data } = await http.get('/api/catalogo/servicios');
                setAvailableServices(data.map((s: any) => ({
                    id: s.id,
                    nombre: s.nombre,
                    duracion_min: s.duracion_min
                })));
            } catch (error) {
                console.error('Error loading services:', error);
            }
        };
        fetchServices();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            const calendarApi = mainCalendarRef.current?.getApi();
            if (calendarApi) {
                calendarApi.updateSize();
            }
        }, 310);
        return () => clearTimeout(timer);
    }, [isSidebarOpen]);

    const handleEventClick = async (info: any) => {
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
                description: "No se pudo cargar el detalle de la reserva."
            });
            setIsDetailModalOpen(false);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setReservaDetail(null);
        setSelectedReservaId(null);
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

    const handleConfirmAppointment = async (data: AdminBookingData) => {
        if (!selectionInfo || !selectionInfo.resource) {
            toast({ variant: "destructive", title: "Error", description: "No hay información de selección válida." });
            setIsModalOpen(false);
            return;
        }

        setLocalLoading(true);

        try {
            const professionalId = parseInt(selectionInfo.resource.id, 10);
            if (isNaN(professionalId)) {
                throw new Error("ID de profesional inválido.");
            }

            if (data.type === 'blocked') {
                // CREAR BLOQUEO
                // Construir fechas ISO completas desde fecha + hora
                const inicioISO = `${data.fecha}T${data.hora_inicio}:00`;
                const finISO = `${data.fecha}T${data.hora_fin}:00`;

                const blockResponse = await createBlock({
                    profesional: professionalId,
                    fecha: data.fecha,
                    inicio: inicioISO,
                    fin: finISO,
                    razon: data.razonBloqueo
                });

                toast({ 
                    title: "Horario Bloqueado", 
                    description: `Bloqueo creado exitosamente.` 
                });

                // Agregar eventos visuales de bloqueo al calendario
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
                        razon: data.razonBloqueo
                    }
                };
                setEvents(prevEvents => [...prevEvents, newBlockedEvent]);

            } else {
                // CREAR CITA (RESERVA)
                if (!data.servicios || data.servicios.length === 0) {
                    throw new Error("Debes seleccionar al menos un servicio.");
                }

                // Construir fechas ISO completas desde fecha + hora
                const inicioISO = `${data.fecha}T${data.hora_inicio}:00`;
                const finISO = `${data.fecha}T${data.hora_fin}:00`;
                
                // Buscar el slot que coincida con el horario seleccionado
                const startTime = new Date(inicioISO);
                const slotId = await findMatchingSlotId(professionalId, startTime);
                
                if (!slotId) {
                    throw new Error(`No se encontró un slot disponible para ${selectionInfo.resource.title} en el horario seleccionado.`);
                }

                const payload: ReservaPayload = {
                    profesional_id: professionalId,
                    cliente: data.cliente!,
                    vehiculo: data.vehiculo,
                    direccion: data.direccion,
                    servicios: data.servicios.map(sid => ({ 
                        servicio_id: sid, 
                        profesional_id: professionalId 
                    })),
                    slot_id: slotId,
                    nota: data.nota || '',
                };

                const nuevaReserva = await createReserva(payload);

                const newEvent = {
                    id: String(nuevaReserva.id),
                    title: `${data.cliente?.nombre} ${data.cliente?.apellido}`,
                    start: inicioISO,
                    end: finISO,
                    resourceId: selectionInfo.resource.id,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    extendedProps: {
                        type: 'appointment',
                        client: `${data.cliente?.nombre} ${data.cliente?.apellido}`,
                        reservaId: nuevaReserva.id
                    }
                };
                setEvents(prevEvents => [...prevEvents, newEvent]);
                toast({ 
                    title: "Cita Creada", 
                    description: `Reserva #${nuevaReserva.id} creada exitosamente.` 
                });
            }

        } catch (error: any) {
            console.error("Error en operación:", error);
            const errorMsg = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
            toast({ 
                variant: "destructive", 
                title: data.type === 'blocked' ? "Error al bloquear" : "Error al crear cita", 
                description: errorMsg 
            });
        } finally {
            setLocalLoading(false);
            setIsModalOpen(false);
        }
    };

    async function findMatchingSlotId(profId: number, startTime: Date): Promise<number | null> {
        try {
            const fecha = startTime.toISOString().split('T')[0];
            const { data } = await http.get('/api/agenda/slots', { 
                params: { profesional_id: profId, fecha } 
            });
            
            const matchingSlot = data.find((slot: any) => {
                const slotStart = new Date(slot.inicio);
                return Math.abs(slotStart.getTime() - startTime.getTime()) < 60000 && slot.estado === 'DISPONIBLE';
            });
            
            return matchingSlot ? matchingSlot.id : null;
        } catch (error) {
            console.error('Error finding slot:', error);
            return null;
        }
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] admin-calendar">
            <aside className={`transition-all duration-300 ease-in-out bg-card border-r border-border flex-shrink-0 overflow-hidden ${isSidebarOpen ? 'w-72' : 'w-0'}`}>
                <div className="w-72 h-full">
                    <CalendarSidebar onDateSelect={handleDateSelectSidebar} resources={resources} />
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
                            plugins={[resourceTimeGridPlugin, dayGridPlugin, interactionPlugin]}
                            schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'resourceTimeGridDay,timeGridWeek,dayGridMonth'
                            }}
                            initialView="resourceTimeGridDay"
                            initialDate={currentDate}
                            locale={esLocale}
                            firstDay={1}
                            slotMinTime="08:00:00"
                            slotMaxTime="19:00:00"
                            allDaySlot={false}
                            resources={resources}
                            events={events}
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
        </div>
    );
};

export default AgendaPage;