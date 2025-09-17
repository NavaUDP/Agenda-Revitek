import FullCalendar from '@fullcalendar/react';
import { useEffect, useRef, useState } from 'react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es'; 
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'; 
import { AppointmentModal, AppointmentData } from '@/components/AppointmentModal';
import { DateSelectArg, EventApi } from '@fullcalendar/core';
import { CalendarSidebar } from '../components/CalendarSidebar';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

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

const resources = [
  { id: 'a', title: 'Felipe Cuevas'},
  { id: 'b', title: 'Isaac Salomón'},
  { id: 'c', title: 'Nicolas Isuani'},
  { id: 'd', title: 'Sergio Lobos'},
  { id: 'e', title: 'Benjamin Troncoso'}
];


const AdminDashboard = () => {
    const [events, setEvents] = useState(initialEvents);
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
        <div className="h-screen bg-background overflow-hidden">
            
            {/* --- CORRECCIÓN 1: La sidebar ahora es 'fixed' --- */}
            <aside className={`fixed top-0 left-0 z-20 w-72 h-full bg-card transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <CalendarSidebar onDateSelect={handleDateSelect} resources={resources} />
            </aside>

            {/* --- CORRECCIÓN 2: El 'main' ahora tiene un margen animado --- */}
            <main className={`h-full overflow-y-auto p-6 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-72' : 'ml-0'}`}>
                {/* --- CORRECCIÓN 3: El botón ahora es 'fixed' para independizarse del margen de 'main' --- */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`fixed top-4 z-30 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'left-72' : 'left-4'}`}
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                    {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
                
                <h1 className="text-3xl font-bold text-foreground mb-8 text-center">Agenda de Citas</h1>
                
                <div className="bg-card p-4 rounded-lg shadow-lg h-[calc(100%-80px)]">
                    <FullCalendar
                        ref={mainCalendarRef}
                        // ... (El resto de las props no cambian)
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

export default AdminDashboard;