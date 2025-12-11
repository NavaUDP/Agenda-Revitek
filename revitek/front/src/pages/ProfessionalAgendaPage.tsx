import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import resourceTimelinePlugin from '@fullcalendar/resource-timeline';
import esLocale from '@fullcalendar/core/locales/es';
import { EventInput, EventClickArg } from '@fullcalendar/core';
import { listReservations, getReservation, ReservationDetailed } from '@/api/agenda';
import { listBlocks } from '@/api/agenda';
import { ReservationDetailsModal } from '@/components/ReservationDetailsModal';

const ProfessionalAgendaPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState<EventInput[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReservation, setSelectedReservation] = useState<ReservationDetailed | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const calendarRef = useRef<FullCalendar>(null);

    const fetchAgendaData = async () => {
        if (!user?.professional_id) {
            toast.error('No se encontró perfil de profesional');
            return;
        }

        setLoading(true);
        try {
            // Obtener reservas del profesional
            const reservations = await listReservations({
                professional_id: user.professional_id,
                include_cancelled: false
            });

            // Obtener bloqueos del profesional
            const blocks = await listBlocks({
                professional_id: user.professional_id
            });

            // Convertir reservas a eventos
            const reservationEvents: EventInput[] = reservations.map(res => {
                const slots = res.reservation_slots || [];
                if (slots.length === 0) return null;

                const firstSlot = slots[0].slot;
                const lastSlot = slots[slots.length - 1].slot;

                let backgroundColor = '#3b82f6';
                let borderColor = '#2563eb';

                if (res.status === 'PENDING') {
                    backgroundColor = '#f59e0b';
                    borderColor = '#d97706';
                } else if (res.status === 'COMPLETED') {
                    backgroundColor = '#10b981';
                    borderColor = '#059669';
                } else if (res.status === 'CANCELLED') {
                    backgroundColor = '#ef4444';
                    borderColor = '#dc2626';
                }

                const clientName = `${res.client_info?.first_name || ''} ${res.client_info?.last_name || ''}`.trim();
                const servicesStr = res.services?.map(s => s.service_name).join(', ') || 'Sin servicios';

                return {
                    id: `reservation-${res.id}`,
                    title: `${clientName} - ${servicesStr}`,
                    start: firstSlot.start,
                    end: lastSlot.end,
                    backgroundColor,
                    borderColor,
                    extendedProps: {
                        type: 'reservation',
                        reservationId: res.id,
                        status: res.status
                    }
                };
            }).filter(Boolean) as EventInput[];

            // Convertir bloqueos a eventos
            const blockEvents: EventInput[] = blocks.map(block => ({
                id: `block-${block.id}`,
                title: `🚫 ${block.reason || 'Bloqueado'}`,
                start: block.start,
                end: block.end,
                backgroundColor: '#6b7280',
                borderColor: '#4b5563',
                extendedProps: {
                    type: 'block',
                    blockId: block.id
                }
            }));

            setEvents([...reservationEvents, ...blockEvents]);
        } catch (error) {
            console.error('Error cargando datos de agenda:', error);
            toast.error('Error al cargar la agenda');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.professional_id) {
            fetchAgendaData();
        }
    }, [user?.professional_id]);

    const handleEventClick = async (info: EventClickArg) => {
        const { type, reservationId } = info.event.extendedProps;

        if (type === 'reservation' && reservationId) {
            try {
                const reservation = await getReservation(reservationId);
                setSelectedReservation(reservation);
                setIsDetailModalOpen(true);
            } catch (error) {
                console.error('Error cargando detalle de reserva:', error);
                toast.error('Error al cargar la reserva');
            }
        } else if (type === 'block') {
            toast.info('Este es un bloqueo de agenda');
        }
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedReservation(null);
    };

    const handleReservationUpdated = () => {
        fetchAgendaData();
        handleCloseDetailModal();
    };

    // Redirigir si no es profesional
    useEffect(() => {
        if (user && !user.professional_id) {
            toast.error('No tienes acceso a esta página');
            navigate('/admin/agenda');
        }
    }, [user, navigate]);

    if (!user?.professional_id) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Cargando...</h2>
                    <p className="text-muted-foreground">
                        Verificando permisos...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-background">
            <div className="border-b border-border">
                <div className="container mx-auto p-6">
                    <h1 className="text-3xl font-bold">Mi Agenda</h1>
                    <p className="text-muted-foreground mt-1">
                        Visualiza tus citas y horarios bloqueados
                    </p>
                </div>
            </div>

            <div className="container mx-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-96">
                        <div>Cargando agenda...</div>
                    </div>
                ) : (
                    <div className="bg-card rounded-lg border border-border p-4">
                        <FullCalendar
                            ref={calendarRef}
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            locale={esLocale}
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            slotMinTime="08:00:00"
                            slotMaxTime="20:00:00"
                            height="auto"
                            events={events}
                            eventClick={handleEventClick}
                            allDaySlot={false}
                            nowIndicator={true}
                            editable={false}
                            selectable={false}
                        />
                    </div>
                )}
            </div>

            {selectedReservation && (
                <ReservationDetailsModal
                    reserva={selectedReservation}
                    open={isDetailModalOpen}
                    onClose={handleCloseDetailModal}
                    onRefresh={handleReservationUpdated}
                />
            )}
        </div>
    );
};

export default ProfessionalAgendaPage;
