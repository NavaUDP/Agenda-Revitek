// revitek/front/src/components/ReservaDetailModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Car, MapPin, Calendar, Clock, FileText, X } from "lucide-react";

interface ReservaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reserva: any; // Idealmente usar el tipo ReservaDetallada
}

export const ReservaDetailModal = ({ isOpen, onClose, reserva }: ReservaDetailModalProps) => {
  if (!reserva) return null;

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      'RESERVADO': { variant: 'default', label: 'Reservado' },
      'CONFIRMADO': { variant: 'default', label: 'Confirmado' },
      'COMPLETADO': { variant: 'outline', label: 'Completado' },
      'CANCELADO': { variant: 'destructive', label: 'Cancelado' },
      'EN_PROGRESO': { variant: 'secondary', label: 'En Progreso' },
    };
    const config = variants[estado] || { variant: 'default', label: estado };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span>Detalle de Reserva #{reserva.id}</span>
            </DialogTitle>
            {getEstadoBadge(reserva.estado)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* INFORMACIÓN DEL CLIENTE */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <User className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Información del Cliente</h3>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              {reserva.cliente ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Nombre Completo</p>
                      <p className="font-medium">
                        {reserva.cliente.nombre} {reserva.cliente.apellido}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{reserva.cliente.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Teléfono</p>
                      <p className="font-medium">{reserva.cliente.telefono}</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">Cliente anónimo</p>
              )}
            </div>
          </div>

          <Separator />

          {/* VEHÍCULO */}
          {reserva.vehiculos && reserva.vehiculos.length > 0 && (
            <>
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Car className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Vehículo</h3>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  {reserva.vehiculos.map((vehiculo: any) => (
                    <div key={vehiculo.id} className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Patente</p>
                        <p className="font-medium text-lg">{vehiculo.patente}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Marca</p>
                        <p className="font-medium">{vehiculo.marca}</p>
                      </div>
                      {vehiculo.modelo && (
                        <div>
                          <p className="text-sm text-muted-foreground">Modelo</p>
                          <p className="font-medium">{vehiculo.modelo}</p>
                        </div>
                      )}
                      {vehiculo.year && (
                        <div>
                          <p className="text-sm text-muted-foreground">Año</p>
                          <p className="font-medium">{vehiculo.year}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* DIRECCIÓN */}
          {reserva.direcciones && reserva.direcciones.length > 0 && (
            <>
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Dirección de Servicio</h3>
                </div>
                <div className="bg-muted/30 rounded-lg p-4">
                  {reserva.direcciones.map((dir: any) => (
                    <div key={dir.id} className="space-y-1">
                      <p className="font-medium">
                        {dir.calle} {dir.numero}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {dir.comuna}, {dir.ciudad}
                      </p>
                      {dir.notas_adicionales && (
                        <p className="text-xs text-muted-foreground italic mt-2">
                          {dir.notas_adicionales}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* FECHA Y HORA */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Horario</h3>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              {reserva.reservaslot ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Inicio</p>
                    <p className="font-medium">
                      {new Date(reserva.reservaslot.inicio).toLocaleString('es-CL', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fin</p>
                    <p className="font-medium">
                      {new Date(reserva.reservaslot.fin).toLocaleString('es-CL', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duración</p>
                    <p className="font-medium">{reserva.total_min} minutos</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sin horario asignado</p>
              )}
            </div>
          </div>

          <Separator />

          {/* SERVICIOS */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Servicios</h3>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              {reserva.servicios && reserva.servicios.length > 0 ? (
                <ul className="space-y-2">
                  {reserva.servicios.map((servicio: any, idx: number) => (
                    <li key={idx} className="flex items-center justify-between">
                      <span>Servicio #{servicio.servicio_id}</span>
                      <span className="text-sm text-muted-foreground">
                        {servicio.duracion_min_eff} min
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">Sin servicios</p>
              )}
            </div>
          </div>

          {/* OBSERVACIONES */}
          {reserva.nota && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-2">Observaciones</h3>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm">{reserva.nota}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {reserva.estado !== 'CANCELADO' && (
            <Button variant="destructive">
              Cancelar Reserva
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};