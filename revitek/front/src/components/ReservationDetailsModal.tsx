import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReservaDetallada } from "@/api/agenda";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, MapPin, User, Car, Phone, Mail, FileText } from "lucide-react";

interface ReservationDetailsModalProps {
    reserva: ReservaDetallada | null;
    open: boolean;
    onClose: () => void;
}

export function ReservationDetailsModal({ reserva, open, onClose }: ReservationDetailsModalProps) {
    if (!reserva) return null;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return <Badge className="bg-green-500">Confirmada</Badge>;
            case 'PENDING': return <Badge className="bg-yellow-500">Pendiente</Badge>;
            case 'WAITING_CLIENT': return <Badge className="bg-blue-500">Espera Cliente</Badge>;
            case 'CANCELLED': return <Badge variant="destructive">Cancelada</Badge>;
            case 'COMPLETED': return <Badge variant="secondary">Completada</Badge>;
            case 'NO_SHOW': return <Badge variant="outline" className="text-destructive border-destructive">No Show</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-center mr-8">
                        <DialogTitle className="text-2xl">Reserva #{reserva.id}</DialogTitle>
                        {getStatusBadge(reserva.status)}
                    </div>
                    <DialogDescription>
                        Creada el {format(new Date(reserva.created_at), "dd/MM/yyyy HH:mm")}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Fecha y Hora */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" /> Fecha y Hora
                        </h3>
                        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                            {reserva.slots_summary ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="capitalize">
                                            {format(new Date(reserva.slots_summary.start), "EEEE d 'de' MMMM yyyy", { locale: es })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span>
                                            {format(new Date(reserva.slots_summary.start), "HH:mm")} - {format(new Date(reserva.slots_summary.end), "HH:mm")}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted-foreground">Sin horario asignado</p>
                            )}
                        </div>
                    </div>

                    {/* Cliente */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" /> Cliente
                        </h3>
                        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                            {reserva.client_info ? (
                                <>
                                    <p className="font-medium">{reserva.client_info.first_name} {reserva.client_info.last_name}</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone className="h-3 w-3 text-muted-foreground" />
                                        <a href={`tel:${reserva.client_info.phone}`} className="hover:underline">{reserva.client_info.phone}</a>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail className="h-3 w-3 text-muted-foreground" />
                                        <a href={`mailto:${reserva.client_info.email}`} className="hover:underline">{reserva.client_info.email}</a>
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted-foreground">Cliente Anónimo</p>
                            )}
                        </div>
                    </div>

                    {/* Dirección */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" /> Dirección
                        </h3>
                        <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                            {reserva.address ? (
                                <>
                                    <p className="font-medium">{reserva.address.street} #{reserva.address.number}</p>
                                    <p>{reserva.address.commune}, {reserva.address.region}</p>
                                    {reserva.address.complement && (
                                        <p className="text-muted-foreground italic">Depto/Casa: {reserva.address.complement}</p>
                                    )}
                                    {reserva.address.notes && (
                                        <p className="text-muted-foreground text-xs mt-2">Nota dir: {reserva.address.notes}</p>
                                    )}
                                </>
                            ) : (
                                <p className="text-muted-foreground">Sin dirección registrada</p>
                            )}
                        </div>
                    </div>

                    {/* Vehículo */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            <Car className="h-5 w-5 text-primary" /> Vehículo
                        </h3>
                        <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                            {reserva.vehicle ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">{reserva.vehicle.brand} {reserva.vehicle.model}</span>
                                        <Badge variant="outline">{reserva.vehicle.license_plate}</Badge>
                                    </div>
                                    {reserva.vehicle.year && <p className="text-muted-foreground">Año: {reserva.vehicle.year}</p>}
                                </>
                            ) : (
                                <p className="text-muted-foreground">Sin vehículo registrado</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Servicios */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" /> Servicios
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="px-4 py-2 text-left">Servicio</th>
                                    <th className="px-4 py-2 text-right">Duración</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reserva.services.map((s) => (
                                    <tr key={s.service_id} className="border-t">
                                        <td className="px-4 py-2">{s.service_name}</td>
                                        <td className="px-4 py-2 text-right">{s.effective_duration_min} min</td>
                                    </tr>
                                ))}
                                <tr className="border-t bg-muted/20 font-medium">
                                    <td className="px-4 py-2">Total</td>
                                    <td className="px-4 py-2 text-right">{reserva.total_min} min</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Notas */}
                {reserva.note && (
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">Notas de la Reserva</h3>
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800">
                            {reserva.note}
                        </div>
                    </div>
                )}

                {/* Cancelación */}
                {reserva.status === 'CANCELLED' && (
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg text-destructive">Información de Cancelación</h3>
                        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg text-sm text-destructive">
                            Cancelada por: {reserva.cancelled_by === 'admin' ? 'Administrador' : 'Cliente'}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
