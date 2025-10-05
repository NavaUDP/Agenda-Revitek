// src/components/CalendarSidebar.tsx

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CalendarSidebarProps {
  onDateSelect: (date: Date) => void;
  resources: Resource[];
  // Añadiremos la lógica de filtros más adelante
}

interface Resource {
  id: string;
  title: string;
}

export const CalendarSidebar = ({ onDateSelect }: CalendarSidebarProps) => {
  return (
    <div className="w-full h-full p-4 bg-card border-r border-border flex flex-col space-y-6">
      {/* --- Filtro de Profesional --- */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">Profesional</label>
        <Select defaultValue="todos">
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar profesional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {/* Aquí mapearías tus recursos/trabajadores */}
            <SelectItem value="a">Felipe Cuevas</SelectItem>
            <SelectItem value="b">Isaac Salomón</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* --- Búsqueda Rápida --- */}
      <Button variant="outline" className="w-full">
        Búsqueda rápida de hora
      </Button>

      {/* --- Mini Calendarios --- */}
      <div className="space-y-4 sidebar-calendar">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          headerToolbar={{
            left: 'prev',
            center: 'title',
            right: 'next'
          }}
          // --- ESTILOS PARA HACERLO COMPACTO ---
          height="auto" // Ajusta la altura al contenido
          aspectRatio={1.5}
          themeSystem="standard" // Usa un tema más limpio
          // --- INTERACCIÓN ---
          dateClick={(info) => {
            onDateSelect(info.date);
          }}
          dayCellClassNames="text-xs p-1"
          dayHeaderClassNames="text-xs"
        />
        {/* Podríamos añadir un segundo calendario para el mes siguiente si es necesario */}
      </div>
    </div>
  );
};