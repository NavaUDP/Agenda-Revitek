// revitek/front/src/pages/AgendaPage.tsx
import FullCalendar from '@fullcalendar/react';
import { useEffect, useRef, useState } from 'react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useOutletContext } from 'react-router-dom';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import { AppointmentModal, AppointmentData } from '@/components/AppointmentModal';
import { DateSelectArg, EventApi } from '@fullcalendar/core';
import { CalendarSidebar } from '../components/CalendarSidebar';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { createReserva, ReservaPayload } from '@/api/agenda'; // Importa la función API y el tipo Payload
import { toast } from "@/components/ui/use-toast"; // Para mostrar notificaciones

// Define el tipo COMPLETO para el contexto que viene de AdminLayout
type AdminContextType = {
    resources: { id: string; title: string; }[];
    setResources: React.Dispatch<React.SetStateAction<{ id: string; title: string; }[]>>;
    events: any[]; // Mantenemos any[] por ahora
    setEvents: React.Dispatch<React.SetStateAction<any[]>>;
    loading: boolean;
};

// Extiende AppointmentData para incluir el ID del servicio si lo añades al modal
interface AppointmentDataExtended extends AppointmentData {
    selectedServiceId?: number; // Opcional: añade esto si modificas el modal
    // Podrías añadir campos de cliente aquí también: clientName?: string, clientEmail?: string, etc.
}


const AgendaPage = () => {
    // Accede al contexto completo
    const context = useOutletContext<AdminContextType>();
    const { resources, events, setEvents, loading: initialLoading } = context; // Desestructura después

    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectionInfo, setSelectionInfo] = useState<DateSelectArg | null>(null);
    const mainCalendarRef = useRef<FullCalendar>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Sidebar abierta por defecto
    const [localLoading, setLocalLoading] = useState(false); // Loading para acciones de esta página

    // Reajusta el tamaño del calendario cuando la sidebar cambia
    useEffect(() => {
        const timer = setTimeout(() => {
            const calendarApi = mainCalendarRef.current?.getApi();
            if (calendarApi) {
                calendarApi.updateSize();
            }
        }, 310); // Un poco más del tiempo de la transición CSS
        return () => clearTimeout(timer);
    }, [isSidebarOpen]);

    // Navega el calendario principal cuando se selecciona una fecha en la sidebar
    const handleDateSelectSidebar = (date: Date) => {
        setCurrentDate(date);
        const calendarApi = mainCalendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.gotoDate(date);
        }
    };

    // Maneja la confirmación del modal para crear cita o bloqueo
    const handleConfirmAppointment = async (data: AppointmentDataExtended) => { // Usa el tipo extendido
        if (!selectionInfo || !selectionInfo.resource) {
            toast({ variant: "destructive", title: "Error", description: "No hay información de selección válida." });
            setIsModalOpen(false);
            return;
        }

        // --- MANEJO DE BLOQUEOS (Aún no implementado vía API estándar) ---
        if (data.type === 'blocked') {
             toast({ title: "Info", description: "La creación de bloqueos desde aquí aún no está implementada vía API." });
            console.warn("Creación de bloqueos no implementada vía API estándar de reserva.");
             // Podrías añadir un evento visual localmente si quieres, pero no se guardará en backend
             const newBlockedEvent = {
                 id: `local_block_${Date.now()}`,
                 title: data.title,
                 start: selectionInfo.startStr,
                 end: selectionInfo.endStr,
                 resourceId: selectionInfo.resource?.id,
                 display: 'background',
                 backgroundColor: '#6b7280',
                 extendedProps: { type: 'blocked' }
             };
             setEvents(prevEvents => [...prevEvents, newBlockedEvent]);
            setIsModalOpen(false);
            return;
        }

        // --- MANEJO DE CITAS (Reservas) ---
        setLocalLoading(true);
        try {
            const professionalId = parseInt(selectionInfo.resource.id, 10);
            if (isNaN(professionalId)) {
                throw new Error("ID de profesional inválido.");
            }

            // --- ¡NECESITAS OBTENER serviceId y slot_id! ---
            // Asumiendo que modificaste el modal para obtener 'selectedServiceId'
            const serviceId = data.selectedServiceId;
            if (!serviceId) {
                 throw new Error("Debes seleccionar un servicio para crear la cita.");
            }

            // --- Lógica crucial pendiente: Obtener el slot_id ---
            // La API `/api/agenda/reservas/` requiere un `slot_id` existente y DISPONIBLE.
            // Necesitas encontrar un Slot en el backend que coincida con:
            // - `profesional_id`
            // - `inicio` (debe coincidir exactamente con selectionInfo.startStr)
            // - `estado` sea 'DISPONIBLE'
            // Podrías:
            // A) Llamar a `listSlots` con profesionalId y la fecha, luego buscar en la respuesta el slot cuyo 'inicio' coincida.
            // B) Crear un nuevo endpoint en Django que reciba (profesionalId, inicio, fin) y devuelva el slot_id si existe y está disponible, o cree uno si la lógica lo permite (esto es más complejo).

            // --- Placeholder para slot_id (¡REEMPLAZAR!) ---
            const slotId = await findMatchingSlotId(professionalId, selectionInfo.start); // Necesitas implementar esta función
            if (!slotId) {
                throw new Error(`No se encontró un slot disponible para ${selectionInfo.resource.title} a las ${selectionInfo.start.toLocaleTimeString()}. Asegúrate de que los slots estén generados.`);
            }
            // --- Fin Placeholder ---


            const payload: ReservaPayload = {
                profesional_id: professionalId,
                // Puedes añadir campos para cliente si los recoges en el modal
                cliente: { nombre: 'Agendado por Admin', email: `admin_${Date.now()}@temp.com` },
                titular_nombre: data.title,
                servicios: [{ servicio_id: serviceId, profesional_id: professionalId }],
                slot_id: slotId, // Usa el slot_id encontrado
                nota: 'Cita creada por administrador desde calendario',
            };

            const nuevaReserva = await createReserva(payload);

            // Actualiza FullCalendar con el nuevo evento
            const newEvent = {
                id: String(nuevaReserva.id),
                title: data.title,
                start: selectionInfo.startStr,
                end: selectionInfo.endStr,
                resourceId: selectionInfo.resource?.id,
                backgroundColor: '#10b981', // O color del profesional
                borderColor: '#059669',
                extendedProps: {
                    type: 'appointment',
                    client: payload.cliente?.nombre || 'Cliente Admin',
                    reservaId: nuevaReserva.id
                }
            };
            setEvents(prevEvents => [...prevEvents, newEvent]);
            toast({ title: "Éxito", description: `Cita ${nuevaReserva.id} creada.` });

        } catch (error: any) {
            console.error("Error creating appointment:", error);
            const errorMsg = error?.response?.data ? JSON.stringify(error.response.data) : error.message;
            toast({ variant: "destructive", title: "Error al crear cita", description: errorMsg });
        } finally {
            setLocalLoading(false);
            setIsModalOpen(false); // Cierra el modal
        }
    };

    // --- Función Placeholder para encontrar Slot ID (¡Necesita implementación real!) ---
    async function findMatchingSlotId(profId: number, startTime: Date): Promise<number | null> {
        console.warn("findMatchingSlotId no implementado - devolviendo null. La creación de reservas fallará.");
        // Aquí deberías llamar a tu API (ej: listSlots) y encontrar el ID
        // const fecha = startTime.toISOString().split('T')[0];
        // const slots = await listSlots({ profesionalId: profId, fecha: fecha });
        // const matchingSlot = slots.find(slot => new Date(slot.inicio).getTime() === startTime.getTime() && slot.estado === 'DISPONIBLE');
        // return matchingSlot ? matchingSlot.id : null;
        return null; // Devuelve null mientras no esté implementado
    }


    return (
        <div className="flex h-full">
             {/* Sidebar */}
            <aside className={`transition-all duration-300 ease-in-out bg-card border-r border-border flex-shrink-0 overflow-hidden ${isSidebarOpen ? 'w-72' : 'w-0'}`}>
                <div className="w-72 h-full"> {/* Contenido con ancho fijo */}
                    <CalendarSidebar onDateSelect={handleDateSelectSidebar} resources={resources} />
                </div>
            </aside>

             {/* Contenido Principal */}
            <main className="flex-1 p-4 md:p-6 h-full overflow-y-auto relative bg-background">
                 {/* Botón para mostrar/ocultar sidebar */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 left-4 z-30 bg-card hover:bg-muted" // Estilo para visibilidad
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>

                {/* Título (Opcional, podrías quitarlo si el header ya lo indica) */}
                {/* <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center pt-8 md:pt-0">Agenda</h1> */}

                 {/* Contenedor del Calendario Principal */}
                <div className="bg-card p-2 sm:p-4 rounded-lg shadow-sm h-full mt-10 md:mt-0"> {/* Ajuste de margen superior en móvil */}
                    {initialLoading && <p className="text-center p-10">Cargando profesionales...</p>}
                    {!initialLoading && (
                        <FullCalendar
                            ref={mainCalendarRef}
                            plugins={[resourceTimeGridPlugin, dayGridPlugin, interactionPlugin]}
                            schedulerLicenseKey="GPL-My-Project-Is-Open-Source" // Clave para vista de recursos
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'resourceTimeGridDay,timeGridWeek,dayGridMonth' // Opciones de vista
                            }}
                            initialView="resourceTimeGridDay" // Vista inicial por día con recursos
                            initialDate={currentDate}
                            locale={esLocale}
                            firstDay={1} // Lunes como primer día
                            slotMinTime="08:00:00"
                            slotMaxTime="19:00:00"
                            allDaySlot={false} // Oculta la fila "todo el día"
                            resources={resources} // Usa los profesionales cargados
                            events={events} // Usa los eventos del estado
                            selectable={true} // Permite seleccionar rangos de tiempo
                            editable={true} // Permite mover/redimensionar eventos (configurado abajo para limitar)
                            eventStartEditable={false} // No permite arrastrar para cambiar inicio
                            eventDurationEditable={false} // No permite redimensionar
                            selectOverlap={(event: EventApi) => event.extendedProps.type !== 'blocked'} // No permite seleccionar sobre bloqueos
                            eventClick={(info) => {
                                // Aquí puedes abrir un modal para VER/EDITAR la cita existente
                                console.log('Event clicked:', info.event);
                                alert(`Cita: ${info.event.title}\nCliente: ${info.event.extendedProps.client || 'N/A'}`);
                            }}
                            select={(info) => {
                                // Abre el modal para CREAR una nueva cita/bloqueo
                                setSelectionInfo(info);
                                setIsModalOpen(true);
                                info.view.calendar.unselect(); // Deselecciona visualmente el rango
                            }}
                            height="100%" // Ocupa toda la altura del contenedor
                            stickyHeaderDates={true} // Encabezados fijos al hacer scroll vertical
                            nowIndicator={true} // Muestra línea de hora actual
                        />
                    )}
                </div>
            </main>

            {/* Modal para crear cita/bloqueo */}
            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmAppointment} // Llama a la función actualizada
                selectionInfo={selectionInfo}
            />
        </div>
    );
};

export default AgendaPage;