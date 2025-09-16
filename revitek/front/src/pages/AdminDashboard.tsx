import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es'; 

const AdminDashboard = () => {
    //datos de referencia, debe venir desde la API
    const events = [
    { 
      title: 'Reunión benja - AUTOMOVIL REVISIÓN TÉCNICA', 
      start: '2025-09-15T09:00:00', 
      end: '2025-09-15T11:00:00',
      backgroundColor: '#3b82f6', // Azul
      borderColor: '#2563eb'
    },
    { 
      title: 'Autospeed Spa - AUTOMOVIL REVISIÓN TÉCNICA', 
      start: '2025-09-15T10:00:00', 
      end: '2025-09-15T12:00:00',
      backgroundColor: '#3b82f6',
      borderColor: '#2563eb'
    },
    {
      title: 'Clases',
      start: '2025-09-15T08:30:00',
      end: '2025-09-15T12:00:00'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">Agenda de Citas</h1>
      
      <div className="bg-card p-4 rounded-lg shadow-lg">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          
          // --- CONFIGURACIÓN DE LA BARRA DE HERRAMIENTAS SUPERIOR ---
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}

          // --- VISTA INICIAL ---
          initialView="timeGridWeek" // Vista de semana con horarios, similar a AgendaPro
          
          // --- IDIOMA Y FORMATO DE HORA ---
          locale={esLocale} // Poner el calendario en español
          firstDay={1} // Lunes como primer día de la semana
          slotMinTime="08:00:00" // Hora de inicio del calendario
          slotMaxTime="19:00:00" // Hora de fin del calendario
          allDaySlot={false} // Ocultar la fila de "todo el día"
          
          // --- EVENTOS (CITAS) ---
          events={events} // Aquí pasas los datos de las citas
          
          // --- INTERACTIVIDAD ---
          editable={true} // Permite arrastrar y redimensionar eventos
          selectable={true} // Permite seleccionar rangos de tiempo
          
          // --- MANEJADORES DE EVENTOS (Callbacks) ---
          // Se ejecuta cuando haces clic en una cita existente
          eventClick={(info) => {
            alert(`Cita: ${info.event.title}`);
            // Aquí podrías abrir un modal para editar la cita
          }}
          
          // Se ejecuta cuando seleccionas un rango de tiempo vacío
          select={(info) => {
            const title = prompt('Introduce el título de la nueva cita:');
            if (title) {
              const calendarApi = info.view.calendar;
              calendarApi.unselect(); // Limpia la selección
              calendarApi.addEvent({
                title,
                start: info.startStr,
                end: info.endStr,
                allDay: info.allDay
              });
              // Aquí deberías llamar a tu API para guardar la nueva cita en la base de datos
            }
          }}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;