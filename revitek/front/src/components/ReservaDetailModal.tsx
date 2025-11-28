// revitek/front/src/components/ReservaDetailModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Car, MapPin, Calendar, Clock, FileText, X } from "lucide-react";
import { useState } from "react";
import { cancelReserva, updateReservaStatus } from "@/api/agenda";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

interface ReservaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reserva: any; // Idealmente usar el tipo ReservaDetallada
  onCancelSuccess?: () => void; // Callback cuando se cancela exitosamente
  onRefreshCalendar?: () => void; // Callback para refrescar el calendario
}

export const ReservaDetailModal = ({ isOpen, onClose, reserva, onCancelSuccess, onRefreshCalendar }: ReservaDetailModalProps) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [cancelledReserva, setCancelledReserva] = useState<any>(null);

  if (!reserva) return null;

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      'RESERVADO': { variant: 'default', label: 'Reservado' },
      'PENDING': { variant: 'warning', label: 'Pendiente' }, // Need to ensure 'warning' variant exists or use 'secondary'
      'CONFIRMED': { variant: 'default', label: 'Confirmado' },
      'COMPLETADO': { variant: 'outline', label: 'Completado' },
      'CANCELADO': { variant: 'destructive', label: 'Cancelado' },
      'EN_PROGRESO': { variant: 'secondary', label: 'En Progreso' },
    };
    // Fallback for PENDING if warning variant doesn't exist in shadcn default
    const config = variants[estado] || { variant: 'secondary', label: estado };

    // Custom style for pending if needed
    if (estado === 'PENDING') {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Pendiente</Badge>;
    }
    if (estado === 'CONFIRMED') {
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">Confirmado</Badge>;
    }

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleCancelClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmReserva = async () => {
    setIsConfirming(true);
    try {
      await updateReservaStatus(reserva.id, 'CONFIRMED');
      toast.success('Reserva confirmada exitosamente');

      // Refresh and close
      if (onRefreshCalendar) onRefreshCalendar();
      onClose();
    } catch (error) {
      console.error('Error confirmando reserva:', error);
      toast.error('Error al confirmar la reserva.');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelReserva(reserva.id);
      setCancelledReserva(result);
      setShowConfirmDialog(false);

      // Llamar callback si existe
      if (onCancelSuccess) {
        onCancelSuccess();
      }

      // Cerrar modal después de 2 segundos para mostrar el mensaje de éxito
      setTimeout(() => {
        onClose();
        // Refrescar el calendario después de cerrar el modal
        if (onRefreshCalendar) {
          onRefreshCalendar();
        }
      }, 2000);
    } catch (error) {
      console.error('Error cancelando reserva:', error);
      toast.error('Error al cancelar la reserva. Por favor intenta de nuevo.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Si la reserva fue cancelada exitosamente, mostrar mensaje
  if (cancelledReserva) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md text-center">
          <div className="space-y-4 py-6">
            <div className="text-green-600 text-5xl">✓</div>
            <h2 className="text-xl font-semibold text-foreground">Reserva Cancelada</h2>
            <p className="text-muted-foreground">
              La reserva #{cancelledReserva.id} ha sido cancelada exitosamente.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {/* Modal principal de detalle */}
      <Dialog open={isOpen && !showConfirmDialog} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>Detalle de Reserva #{reserva.id}</span>
              </DialogTitle>
              {getEstadoBadge(reserva.status || reserva.estado)}
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
                {reserva.client_info ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Nombre Completo</p>
                        <p className="font-medium">
                          {reserva.client_info.first_name} {reserva.client_info.last_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{reserva.client_info.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Teléfono</p>
                        <p className="font-medium">{reserva.client_info.phone}</p>
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
            {(reserva.vehicle || (reserva.client_vehicles && reserva.client_vehicles.length > 0)) && (
              <>
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Car className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Vehículo</h3>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    {reserva.vehicle ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Patente</p>
                          <p className="font-medium text-lg">{reserva.vehicle.license_plate}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Marca</p>
                          <p className="font-medium">{reserva.vehicle.brand}</p>
                        </div>
                        {reserva.vehicle.model && (
                          <div>
                            <p className="text-sm text-muted-foreground">Modelo</p>
                            <p className="font-medium">{reserva.vehicle.model}</p>
                          </div>
                        )}
                        {reserva.vehicle.year && (
                          <div>
                            <p className="text-sm text-muted-foreground">Año</p>
                            <p className="font-medium">{reserva.vehicle.year}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-yellow-600 font-medium bg-yellow-50 p-2 rounded">
                          ⚠️ Vehículo no especificado en la reserva. Mostrando vehículos del cliente:
                        </p>
                        {reserva.client_vehicles.map((v: any) => (
                          <div key={v.id} className="grid grid-cols-2 gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                            <div>
                              <p className="text-sm text-muted-foreground">Patente</p>
                              <p className="font-medium">{v.license_plate}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Marca</p>
                              <p className="font-medium">{v.brand}</p>
                            </div>
                            {v.model && (
                              <div>
                                <p className="text-sm text-muted-foreground">Modelo</p>
                                <p className="font-medium">{v.model}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* DIRECCIÓN */}
            {(reserva.address || (reserva.client_addresses && reserva.client_addresses.length > 0)) && (
              <>
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Dirección de Servicio</h3>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4">
                    {reserva.address ? (
                      <div className="space-y-1">
                        <p className="font-medium">
                          {reserva.address.street} {reserva.address.number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {reserva.address.commune}, {reserva.address.region}
                        </p>
                        {reserva.address.notes && (
                          <p className="text-xs text-muted-foreground italic mt-2">
                            {reserva.address.notes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-yellow-600 font-medium bg-yellow-50 p-2 rounded">
                          ⚠️ Dirección no especificada en la reserva. Mostrando direcciones del cliente:
                        </p>
                        {reserva.client_addresses.map((dir: any) => (
                          <div key={dir.id} className="space-y-1 border-b border-border pb-2 last:border-0 last:pb-0">
                            <p className="font-medium">
                              {dir.street} {dir.number}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {dir.commune}, {dir.region}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
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
                {reserva.slots_summary ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Inicio</p>
                      <p className="font-medium">
                        {new Date(reserva.slots_summary.start).toLocaleString('es-CL', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fin</p>
                      <p className="font-medium">
                        {new Date(reserva.slots_summary.end).toLocaleString('es-CL', {
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
                {reserva.services && reserva.services.length > 0 ? (
                  <ul className="space-y-2">
                    {reserva.services.map((servicio: any, idx: number) => (
                      <li key={idx} className="flex items-center justify-between">
                        <span>{servicio.service_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {servicio.effective_duration_min} min
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

            {/* Botón Confirmar solo si está PENDING */}
            {(reserva.status === 'PENDING' || reserva.estado === 'PENDING') && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleConfirmReserva}
                disabled={isConfirming || isCancelling}
              >
                {isConfirming ? 'Confirmando...' : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" /> Confirmar Reserva
                  </>
                )}
              </Button>
            )}

            {reserva.estado !== 'CANCELADO' && reserva.status !== 'CANCELADO' && (
              <Button
                variant="destructive"
                onClick={handleCancelClick}
                disabled={isCancelling || isConfirming}
              >
                {isCancelling ? 'Cancelando...' : 'Cancelar Reserva'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirmar Cancelación</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-foreground">
              ¿Estás seguro de que deseas cancelar la reserva #{reserva.id}?
            </p>
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer y el cliente será notificado de la cancelación.
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isCancelling}
            >
              No, mantener reserva
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelando...' : 'Sí, cancelar reserva'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};