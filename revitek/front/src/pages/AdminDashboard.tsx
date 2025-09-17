import FullCalendar from '@fullcalendar/react';
import { useState } from 'react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es'; 
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'; 
import { AppointmentModal, AppointmentData } from '@/components/AppointmentModal';
import { DateSelectArg, EventApi } from '@fullcalendar/core';

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectionInfo, setSelectionInfo] = useState<DateSelectArg | null>(null);

    const handleConfirmAppointment = (data: AppointmentData) => {
        // ... (esta función no cambia)
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold text-foreground mb-8">Agenda de Citas</h1>
            
            <div className="bg-card p-4 rounded-lg shadow-lg">
                <FullCalendar
                    // ... (todas tus props se mantienen igual hasta aquí)
                    plugins={[resourceTimeGridPlugin, dayGridPlugin, interactionPlugin]}
                    schedulerLicenseKey="GPL-My-Project-Is-Open-Source"
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,resourceTimeGridDay' }}
                    initialView="resourceTimeGridDay"
                    locale={esLocale}
                    firstDay={1}
                    slotMinTime="08:00:00"
                    slotMaxTime="19:00:00"
                    allDaySlot={false}
                    resources={resources}
                    events={events}
                    editable={true}
                    selectable={true}
                    
                    eventStartEditable={false}    // Evita que los eventos se puedan arrastrar y mover
                    eventDurationEditable={false} // Evita que se pueda cambiar la duración de los eventos
                    
                    selectOverlap={(event: EventApi) => {
                        return event.extendedProps.type !== 'blocked';
                    }}

                    eventClick={(info) => {
                        if (info.event.display !== 'background') {
                            alert(`Cita: ${info.event.title}`);
                        }
                    }}
                    
                    select={(info) => {
                        setSelectionInfo(info);
                        setIsModalOpen(true);
                        info.view.calendar.unselect();
                    }}
                />
            </div>

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