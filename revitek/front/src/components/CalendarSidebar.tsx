// src/components/CalendarSidebar.tsx

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Calendar as CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CalendarSidebarProps {
  onDateSelect: (date: Date) => void;
  resources: Resource[];
  selectedProfessionalId: string | null;
  onProfessionalSelect: (professionalId: string | null) => void;
}

interface Resource {
  id: string;
  title: string;
}

export const CalendarSidebar = ({ 
  onDateSelect, 
  resources, 
  selectedProfessionalId, 
  onProfessionalSelect 
}: CalendarSidebarProps) => {
  
  const handleProfessionalChange = (value: string) => {
    if (value === "todos") {
      onProfessionalSelect(null);
    } else {
      onProfessionalSelect(value);
    }
  };

  return (
    <div className="w-full h-full p-4 bg-card border-r border-border flex flex-col space-y-6">
      {/* --- Filtro de Profesional --- */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <label className="text-sm font-semibold text-foreground">Profesional</label>
        </div>
        <Select 
          value={selectedProfessionalId || "todos"} 
          onValueChange={handleProfessionalChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar profesional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">
              <div className="flex items-center gap-2">
                <span>👥 Todos los Profesionales</span>
              </div>
            </SelectItem>
            {resources.map((resource) => (
              <SelectItem key={resource.id} value={resource.id}>
                <div className="flex items-center gap-2">
                  <span>👤 {resource.title}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedProfessionalId && (
          <Badge variant="secondary" className="w-full justify-center">
            Vista Individual Activa
          </Badge>
        )}
      </div>

      {/* --- Mini Calendario --- */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <label className="text-sm font-semibold text-foreground">Navegación Rápida</label>
        </div>
        <div className="sidebar-calendar">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            headerToolbar={{
              left: 'prev',
              center: 'title',
              right: 'next'
            }}
            height="auto"
            aspectRatio={1.5}
            themeSystem="standard"
            dateClick={(info) => {
              onDateSelect(info.date);
            }}
            dayCellClassNames="text-xs p-1 cursor-pointer hover:bg-muted/50 transition-colors"
            dayHeaderClassNames="text-xs font-semibold"
          />
        </div>
      </div>

      {/* --- Información de Vista --- */}
      <div className="mt-auto pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>🟢 <strong>Vista General:</strong> Todos los profesionales en vista diaria</p>
          <p>🔵 <strong>Vista Individual:</strong> Semana completa del profesional seleccionado</p>
        </div>
      </div>
    </div>
  );
};