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

type AdminContextType = {
  resources: { id: string; title: string; }[];
  events: any[]; // Puedes definir un tipo más estricto si quieres
  setEvents: React.Dispatch<React.SetStateAction<any[]>>;
};

const AgendaPage = () => {

    const { resources, events, setEvents } = useOutletContext<AdminContextType>();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectionInfo, setSelectionInfo] = useState<DateSelectArg | null>(null);
    const mainCalendarRef = useRef<FullCalendar>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            const calendarApi = mainCalendarRef.current?.getApi();
            if (calendarApi) {
                calendarApi.updateSize();
            }
        }, 310);
        return () => clearTimeout(timer);
    }, [isSidebarOpen]);

    const handleDateSelect = (date: Date) => {
        setCurrentDate(date);
        const calendarApi = mainCalendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.gotoDate(date);
        }
    };

    const handleConfirmAppointment = (data: AppointmentData) => {
        if (selectionInfo) {
            let newEvent;
            if (data.type === 'appointment') {
                newEvent = {
                    id: String(Date.now()),
                    title: data.title,
                    start: selectionInfo.startStr,
                    end: selectionInfo.endStr,
                    resourceId: selectionInfo.resource?.id,
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    extendedProps: { type: 'appointment', client: 'Nuevo Cliente' }
                };
            } else {
                newEvent = {
                    id: String(Date.now()),
                    title: data.title,
                    start: selectionInfo.startStr,
                    end: selectionInfo.endStr,
                    resourceId: selectionInfo.resource?.id,
                    display: 'background',
                    backgroundColor: '#6b7280',
                    extendedProps: { type: 'blocked' }
                };
            }
            setEvents(prevEvents => [...prevEvents, newEvent]);
        }
    };

    return (
        // --- CORRECCIÓN 1: El contenedor es un flexbox horizontal ---
        <div className="flex h-full">
            
            {/* --- CORRECCIÓN 2: La sidebar anima su ANCHO, no su posición --- */}
            <aside className={`transition-all duration-300 ease-in-out bg-card flex-shrink-0 overflow-hidden ${isSidebarOpen ? 'w-72' : 'w-0'}`}>
                {/* Contenido de la sidebar con un ancho fijo para que no se encoja durante la animación */}
                <div className="w-72 h-full">
                    <CalendarSidebar onDateSelect={handleDateSelect} resources={resources} />
                </div>
            </aside>

            {/* --- CORRECCIÓN 3: El main ahora es un flex-item que se expande y es relativo --- */}
            <main className="flex-1 p-6 h-full overflow-y-auto relative">
                {/* El botón se posiciona absoluto a este contenedor 'main' */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 left-4 z-30"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                
                <h1 className="text-3xl font-bold text-foreground mb-8 text-center">Agenda de Citas</h1>
                
                <div className="bg-card p-4 rounded-lg shadow-lg h-[calc(100%-80px)]">
                    <FullCalendar
                        ref={mainCalendarRef}
                        // ... (el resto de las props no cambian)
                        plugins={[resourceTimeGridPlugin, dayGridPlugin, interactionPlugin]}
                        schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
                        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,resourceTimeGridDay' }}
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
                        eventClick={(info) => { /* ... */ }}
                        select={(info) => {
                            setSelectionInfo(info);
                            setIsModalOpen(true);
                            info.view.calendar.unselect();
                        }}
                    />
                </div>
            </main>

            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmAppointment}
                selectionInfo={selectionInfo}
            />
        </div>
    );
};

export default AgendaPage;