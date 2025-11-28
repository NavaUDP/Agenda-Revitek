// src/components/AdminBookingModal.tsx
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateSelectArg } from '@fullcalendar/core';
import { User, Car, MapPin, FileText } from 'lucide-react';

export type AdminBookingType = 'appointment' | 'blocked';

export interface AdminBookingData {
  type: AdminBookingType;
  // Datos para citas (Formato ReservaDetailModal)
  cliente?: {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
  };
  vehiculo?: {
    patente: string;
    marca: string;
    modelo?: string;
    year?: number;
  };
  direccion?: {
    calle: string;
    numero: string;
    comuna?: string;
    ciudad?: string;
    notas_adicionales?: string;
  };
  servicios?: number[];
  nota?: string;
  // Datos para bloqueos
  razonBloqueo?: string;
  aplicar_a_rango?: boolean;
  fecha_fin?: string;
  // Horario
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

interface AdminBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: AdminBookingData) => void;
  selectionInfo: DateSelectArg | null;
  availableServices: Array<{ id: number; nombre: string; duracion_min: number }>;
  initialData?: AdminBookingData | null;
  isEditing?: boolean;
}

// Generar horas en intervalos de 1 hora de 8:00 a 19:00
const generateHourOptions = () => {
  const hours = [];
  for (let h = 8; h <= 19; h++) {
    const hour = h.toString().padStart(2, '0');
    hours.push(`${hour}:00`);
  }
  return hours;
};

export const AdminBookingModal = ({
  isOpen,
  onClose,
  onConfirm,
  selectionInfo,
  availableServices,
  initialData = null,
  isEditing = false
}: AdminBookingModalProps) => {
  const [bookingType, setBookingType] = useState<AdminBookingType>('appointment');

  // Fecha y horas con selectores
  const [fecha, setFecha] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [aplicarRango, setAplicarRango] = useState(false);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('10:00');

  // Datos de cita (Formato ReservaDetailModal)
  const [cliente, setCliente] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: ''
  });

  const [vehiculo, setVehiculo] = useState<{
    patente: string;
    marca: string;
    modelo?: string;
    year?: number;
  }>({
    patente: '',
    marca: ''
  });

  const [direccion, setDireccion] = useState<{
    calle: string;
    numero: string;
    comuna?: string;
    ciudad?: string;
    notas_adicionales?: string;
  }>({
    calle: '',
    numero: ''
  });

  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [nota, setNota] = useState('');

  // Datos de bloqueo
  const [razonBloqueo, setRazonBloqueo] = useState('');

  // Errores
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hourOptions = generateHourOptions();

  useEffect(() => {
    if (isOpen && (selectionInfo || initialData)) {
      if (initialData && isEditing) {
        // Modo edición
        setBookingType(initialData.type);
        setFecha(initialData.fecha);
        setFechaFin(initialData.fecha_fin || initialData.fecha);
        setAplicarRango(initialData.aplicar_a_rango || false);
        setHoraInicio(initialData.hora_inicio);
        setHoraFin(initialData.hora_fin);

        if (initialData.type === 'appointment') {
          setCliente(initialData.cliente || { nombre: '', apellido: '', email: '', telefono: '' });
          setVehiculo(initialData.vehiculo || { patente: '', marca: '' });
          setDireccion(initialData.direccion || { calle: '', numero: '' });
          setSelectedServices(initialData.servicios || []);
          setNota(initialData.nota || '');
        } else {
          setRazonBloqueo(initialData.razonBloqueo || '');
        }
      } else if (selectionInfo) {
        // Modo creación desde selección en calendario
        const startDate = new Date(selectionInfo.start);
        const fechaStr = startDate.toISOString().split('T')[0];
        setFecha(fechaStr);
        setFechaFin(fechaStr);
        setAplicarRango(false);
        setHoraInicio(startDate.getHours().toString().padStart(2, '0') + ':00');

        const endDate = new Date(selectionInfo.end);
        setHoraFin(endDate.getHours().toString().padStart(2, '0') + ':00');

        // Reset form
        setBookingType('appointment');
        setCliente({ nombre: '', apellido: '', email: '', telefono: '' });
        setVehiculo({ patente: '', marca: '' });
        setDireccion({ calle: '', numero: '' });
        setSelectedServices([]);
        setNota('');
        setRazonBloqueo('');
        setErrors({});
      }
    }
  }, [isOpen, selectionInfo, initialData, isEditing]);

  const validateAppointment = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!cliente.nombre.trim()) newErrors.nombre = 'Nombre requerido';
    if (!cliente.apellido.trim()) newErrors.apellido = 'Apellido requerido';
    if (!cliente.email.trim()) {
      newErrors.email = 'Email requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!cliente.telefono.trim()) newErrors.telefono = 'Teléfono requerido';
    if (!vehiculo.patente.trim()) newErrors.patente = 'Patente requerida';
    if (!vehiculo.marca.trim()) newErrors.marca = 'Marca requerida';
    if (!direccion.calle.trim()) newErrors.calle = 'Calle requerida';
    if (!direccion.numero.trim()) newErrors.numero = 'Número requerido';
    if (selectedServices.length === 0) newErrors.servicios = 'Selecciona al menos un servicio';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateBlocked = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!razonBloqueo.trim()) newErrors.razon = 'Razón del bloqueo requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (bookingType === 'appointment') {
      if (!validateAppointment()) return;

      const data: AdminBookingData = {
        type: 'appointment',
        cliente: {
          nombre: cliente.nombre.trim(),
          apellido: cliente.apellido.trim(),
          email: cliente.email.trim().toLowerCase(),
          telefono: cliente.telefono.trim()
        },
        vehiculo: {
          patente: vehiculo.patente.trim().toUpperCase(),
          marca: vehiculo.marca.trim(),
          modelo: vehiculo.modelo?.trim(),
          year: vehiculo.year
        },
        direccion: {
          calle: direccion.calle.trim(),
          numero: direccion.numero.trim(),
          comuna: direccion.comuna?.trim(),
          ciudad: direccion.ciudad?.trim(),
          notas_adicionales: direccion.notas_adicionales?.trim()
        },
        servicios: selectedServices,
        nota: nota.trim(),
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin
      };

      onConfirm(data);
    } else {
      if (!validateBlocked()) return;

      const data: AdminBookingData = {
        type: 'blocked',
        razonBloqueo: razonBloqueo.trim(),
        aplicar_a_rango: aplicarRango,
        fecha_fin: aplicarRango ? fechaFin : fecha,
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin
      };

      onConfirm(data);
    }

    onClose();
  };

  const toggleService = (serviceId: number) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
    if (errors.servicios) {
      setErrors(prev => ({ ...prev, servicios: '' }));
    }
  };

  if (!selectionInfo && !initialData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEditing
              ? (bookingType === 'appointment' ? '✏️ Editar Cita' : '✏️ Editar Bloqueo')
              : (bookingType === 'appointment' ? '📅 Crear Nueva Cita' : '🚫 Bloquear Horario')
            }
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tipo de Reserva (solo en modo creación) */}
          {!isEditing && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Tipo de Acción</Label>
              <RadioGroup value={bookingType} onValueChange={(value: AdminBookingType) => setBookingType(value)}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="appointment" id="type-appointment" />
                  <Label htmlFor="type-appointment" className="cursor-pointer flex-1">
                    <div className="font-medium">Nueva Cita</div>
                    <div className="text-sm text-muted-foreground">Agendar servicio para un cliente</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value="blocked" id="type-blocked" />
                  <Label htmlFor="type-blocked" className="cursor-pointer flex-1">
                    <div className="font-medium">Bloquear Horario</div>
                    <div className="text-sm text-muted-foreground">Marcar como no disponible</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Selección de Horario con Selectores */}
          <div className="bg-muted/30 p-4 rounded-lg space-y-3">
            <div className="text-sm font-semibold">📅 Horario</div>

            {/* Opción de rango solo para bloqueos */}
            {bookingType === 'blocked' && (
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-background">
                <input
                  type="checkbox"
                  id="aplicar-rango"
                  checked={aplicarRango}
                  onChange={(e) => setAplicarRango(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="aplicar-rango" className="cursor-pointer text-sm">
                  Bloquear múltiples días (vacaciones, ausencia prolongada)
                </Label>
              </div>
            )}

            <div className={`grid gap-4 ${aplicarRango && bookingType === 'blocked' ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <div>
                <Label htmlFor="fecha">{aplicarRango && bookingType === 'blocked' ? 'Fecha Inicio' : 'Fecha'}</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="mt-1"
                />
              </div>

              {aplicarRango && bookingType === 'blocked' && (
                <div>
                  <Label htmlFor="fecha-fin">Fecha Fin</Label>
                  <Input
                    id="fecha-fin"
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    min={fecha}
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="hora-inicio">Hora Inicio</Label>
                <Select value={horaInicio} onValueChange={setHoraInicio}>
                  <SelectTrigger id="hora-inicio" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map(hour => (
                      <SelectItem key={`inicio-${hour}`} value={hour}>{hour}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="hora-fin">Hora Fin</Label>
                <Select value={horaFin} onValueChange={setHoraFin}>
                  <SelectTrigger id="hora-fin" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map(hour => (
                      <SelectItem key={`fin-${hour}`} value={hour}>{hour}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {aplicarRango && bookingType === 'blocked' && fechaFin && fecha && (
              <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                ℹ️ Se bloquearán {Math.ceil((new Date(fechaFin).getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24)) + 1} días desde {new Date(fecha).toLocaleDateString('es-CL')} hasta {new Date(fechaFin).toLocaleDateString('es-CL')}
              </div>
            )}

            {selectionInfo && (
              <div className="text-sm text-muted-foreground">
                <strong>Profesional:</strong> {selectionInfo.resource?.title}
              </div>
            )}
          </div>

          {/* FORMULARIO DE CITA (Formato ReservaDetailModal) */}
          {bookingType === 'appointment' && (
            <>
              {/* Información del Cliente */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <Label className="text-base font-semibold">Información del Cliente</Label>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nombre">Nombre *</Label>
                      <Input
                        id="nombre"
                        value={cliente.nombre}
                        onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                        className={errors.nombre ? 'border-red-500' : ''}
                      />
                      {errors.nombre && <p className="text-sm text-red-500 mt-1">{errors.nombre}</p>}
                    </div>
                    <div>
                      <Label htmlFor="apellido">Apellido *</Label>
                      <Input
                        id="apellido"
                        value={cliente.apellido}
                        onChange={(e) => setCliente({ ...cliente, apellido: e.target.value })}
                        className={errors.apellido ? 'border-red-500' : ''}
                      />
                      {errors.apellido && <p className="text-sm text-red-500 mt-1">{errors.apellido}</p>}
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={cliente.email}
                        onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label htmlFor="telefono">Teléfono *</Label>
                      <Input
                        id="telefono"
                        value={cliente.telefono}
                        onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                        className={errors.telefono ? 'border-red-500' : ''}
                      />
                      {errors.telefono && <p className="text-sm text-red-500 mt-1">{errors.telefono}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehículo */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  <Label className="text-base font-semibold">Vehículo</Label>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="patente">Patente *</Label>
                      <Input
                        id="patente"
                        value={vehiculo.patente}
                        onChange={(e) => setVehiculo({ ...vehiculo, patente: e.target.value })}
                        placeholder="ABCD12"
                        className={errors.patente ? 'border-red-500' : ''}
                      />
                      {errors.patente && <p className="text-sm text-red-500 mt-1">{errors.patente}</p>}
                    </div>
                    <div>
                      <Label htmlFor="marca">Marca *</Label>
                      <Input
                        id="marca"
                        value={vehiculo.marca}
                        onChange={(e) => setVehiculo({ ...vehiculo, marca: e.target.value })}
                        placeholder="Toyota"
                        className={errors.marca ? 'border-red-500' : ''}
                      />
                      {errors.marca && <p className="text-sm text-red-500 mt-1">{errors.marca}</p>}
                    </div>
                    <div>
                      <Label htmlFor="modelo">Modelo</Label>
                      <Input
                        id="modelo"
                        value={vehiculo.modelo}
                        onChange={(e) => setVehiculo({ ...vehiculo, modelo: e.target.value })}
                        placeholder="Corolla"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dirección del Servicio */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <Label className="text-base font-semibold">Dirección del Servicio</Label>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="calle">Calle *</Label>
                      <Input
                        id="calle"
                        value={direccion.calle}
                        onChange={(e) => setDireccion({ ...direccion, calle: e.target.value })}
                        placeholder="Av. Principal"
                        className={errors.calle ? 'border-red-500' : ''}
                      />
                      {errors.calle && <p className="text-sm text-red-500 mt-1">{errors.calle}</p>}
                    </div>
                    <div>
                      <Label htmlFor="numero">Número *</Label>
                      <Input
                        id="numero"
                        value={direccion.numero}
                        onChange={(e) => setDireccion({ ...direccion, numero: e.target.value })}
                        placeholder="123"
                        className={errors.numero ? 'border-red-500' : ''}
                      />
                      {errors.numero && <p className="text-sm text-red-500 mt-1">{errors.numero}</p>}
                    </div>
                    <div>
                      <Label htmlFor="comuna">Comuna</Label>
                      <Input
                        id="comuna"
                        value={direccion.comuna}
                        onChange={(e) => setDireccion({ ...direccion, comuna: e.target.value })}
                        placeholder="Santiago"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ciudad">Ciudad</Label>
                      <Input
                        id="ciudad"
                        value={direccion.ciudad}
                        onChange={(e) => setDireccion({ ...direccion, ciudad: e.target.value })}
                        placeholder="Santiago"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="notas_adicionales">Notas Adicionales</Label>
                      <Input
                        id="notas_adicionales"
                        value={direccion.notas_adicionales}
                        onChange={(e) => setDireccion({ ...direccion, notas_adicionales: e.target.value })}
                        placeholder="Ej: Departamento 405"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Servicios */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <Label className="text-base font-semibold">Servicios *</Label>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto border rounded-lg p-3">
                  {availableServices.map(service => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`service-${service.id}`}
                        checked={selectedServices.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        className="rounded"
                      />
                      <Label htmlFor={`service-${service.id}`} className="cursor-pointer text-sm">
                        {service.nombre} ({service.duracion_min} min)
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.servicios && <p className="text-sm text-red-500">{errors.servicios}</p>}
              </div>

              {/* Observaciones */}
              <div>
                <Label htmlFor="nota">Observaciones</Label>
                <Textarea
                  id="nota"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Comentarios adicionales..."
                  rows={3}
                />
              </div>
            </>
          )}

          {/* FORMULARIO DE BLOQUEO */}
          {bookingType === 'blocked' && (
            <div className="space-y-3">
              <Label htmlFor="razon-bloqueo" className="text-base font-semibold">
                Razón del Bloqueo *
              </Label>
              <Textarea
                id="razon-bloqueo"
                value={razonBloqueo}
                onChange={(e) => setRazonBloqueo(e.target.value)}
                placeholder="Ej: Almuerzo, Reunión, Trámites personales..."
                rows={3}
                className={errors.razon ? 'border-red-500' : ''}
              />
              {errors.razon && <p className="text-sm text-red-500">{errors.razon}</p>}
              <p className="text-sm text-muted-foreground">
                Este horario quedará bloqueado y no estará disponible para reservas de clientes.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing
              ? (bookingType === 'appointment' ? 'Actualizar Cita' : 'Actualizar Bloqueo')
              : (bookingType === 'appointment' ? 'Crear Cita' : 'Bloquear Horario')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
