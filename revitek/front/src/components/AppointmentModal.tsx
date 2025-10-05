// src/components/AppointmentModal.tsx

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // <-- NUEVO
import { Label } from "@/components/ui/label"; // <-- NUEVO
import { DateSelectArg } from '@fullcalendar/core';

// NUEVO: Definimos un tipo para los datos del evento
export type AppointmentData = {
  title: string;
  type: 'appointment' | 'blocked';
}

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // NUEVO: onConfirm ahora pasará el objeto AppointmentData
  onConfirm: (data: AppointmentData) => void; 
  selectionInfo: DateSelectArg | null;
}

export const AppointmentModal = ({ isOpen, onClose, onConfirm, selectionInfo }: AppointmentModalProps) => {
  const [title, setTitle] = useState('');
  // NUEVO: Estado para el tipo de evento, por defecto es 'appointment'
  const [eventType, setEventType] = useState<'appointment' | 'blocked'>('appointment');

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setEventType('appointment'); // Resetea al valor por defecto al abrir
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (title.trim()) {
      // Pasamos el objeto completo con título y tipo
      onConfirm({ title, type: eventType });
      onClose();
    }
  };

  if (!selectionInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          {/* El título del modal cambia dinámicamente */}
          <DialogTitle>
            {eventType === 'appointment' ? 'Crear Nueva Cita' : 'Bloquear Horario'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          
          {/* --- NUEVO: Selección de Tipo de Evento --- */}
          <RadioGroup value={eventType} onValueChange={(value: 'appointment' | 'blocked') => setEventType(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="appointment" id="r1" />
              <Label htmlFor="r1">Nueva Cita</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="blocked" id="r2" />
              <Label htmlFor="r2">Bloquear Horario (No Disponible)</Label>
            </div>
          </RadioGroup>

          <div className="flex flex-col space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              {eventType === 'appointment' ? 'Título de la Cita' : 'Motivo del Bloqueo'}
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={eventType === 'appointment' ? 'Ej: Revisión Técnica Juan Pérez' : 'Ej: Almuerzo, Trámites'}
              autoFocus
            />
          </div>
          <div className="text-sm text-muted-foreground border-t pt-4 mt-2">
            <p><strong>Trabajador:</strong> {selectionInfo.resource?.title}</p>
            <p><strong>Inicio:</strong> {new Date(selectionInfo.startStr).toLocaleString()}</p>
            <p><strong>Fin:</strong> {new Date(selectionInfo.endStr).toLocaleString()}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};