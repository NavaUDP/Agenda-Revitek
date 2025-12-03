import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ReservationDetailed } from '@/api/agenda';
import { Professional } from '@/types/professionals';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ReservationsTableProps {
    reservations: ReservationDetailed[];
    professionals: Professional[];
    loading: boolean;
    onStatusChange: (id: number, status: string) => void;
    onCancel: (id: number) => void;
    onViewDetails: (res: ReservationDetailed) => void;
}

export default function ReservationsTable({
    reservations,
    professionals,
    loading,
    onStatusChange,
    onCancel,
    onViewDetails
}: ReservationsTableProps) {

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
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Fecha / Hora</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Profesional</TableHead>
                            <TableHead>Servicios</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">Cargando reservas...</TableCell>
                            </TableRow>
                        ) : reservations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No se encontraron reservas.</TableCell>
                            </TableRow>
                        ) : (
                            reservations.map((res) => (
                                <TableRow key={res.id}>
                                    <TableCell className="font-medium">#{res.id}</TableCell>
                                    <TableCell>
                                        {res.slots_summary ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium capitalize">
                                                    {format(new Date(res.slots_summary.start), "EEEE d MMM", { locale: es })}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(res.slots_summary.start), "HH:mm")} - {format(new Date(res.slots_summary.end), "HH:mm")}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {res.client_info ? (
                                            <div className="flex flex-col">
                                                <span>{res.client_info.first_name} {res.client_info.last_name}</span>
                                                <span className="text-xs text-muted-foreground">{res.client_info.phone}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">Anónimo</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {professionals.find(p => p.id === res.slots_summary?.professional_id)?.first_name || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {res.services.map(s => (
                                                <Badge key={s.service_id} variant="secondary" className="w-fit text-[10px]">
                                                    {s.service_name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(res.status)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {res.status === 'PENDING' && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" title="Confirmar">
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Confirmar reserva?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                La reserva pasará a estado CONFIRMADA.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => onStatusChange(res.id, 'CONFIRMED')}>
                                                                Confirmar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}

                                            {res.status !== 'CANCELLED' && res.status !== 'COMPLETED' && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" title="Cancelar">
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción no se puede deshacer. La reserva quedará cancelada.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Volver</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => onCancel(res.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Cancelar Reserva
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}

                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                title="Ver Detalles"
                                                onClick={() => onViewDetails(res)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
