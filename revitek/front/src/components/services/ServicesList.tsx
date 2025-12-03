import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Loader2 } from 'lucide-react';
import { Service } from '@/types/services';
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

interface ServicesListProps {
    services: Service[];
    loading: boolean;
    error: string | null;
    onEdit: (service: Service) => void;
    onDelete: (id: number, name: string) => void;
}

export default function ServicesList({ services, loading, error, onEdit, onDelete }: ServicesListProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Servicios Registrados</CardTitle>
            </CardHeader>
            <CardContent>
                {loading && !services.length ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : error ? (
                    <p className="text-destructive text-center p-4">{error}</p>
                ) : (
                    <ul className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                        {services.length === 0 && (
                            <p className="text-center text-muted-foreground py-8">No hay servicios registrados.</p>
                        )}
                        {services.map(s => (
                            <li key={s.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md gap-3 transition-colors ${s.active ? 'bg-card hover:border-primary/50' : 'bg-muted/50 opacity-70'}`}>
                                <div className="w-full sm:w-auto">
                                    <div className="flex items-center justify-between sm:justify-start gap-2">
                                        <span className="font-semibold">{s.name}</span>
                                        {!s.active && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                                        {s.category && <Badge variant="outline" className="text-xs">{s.category}</Badge>}
                                    </div>
                                    <span className="text-sm text-muted-foreground block mt-1 sm:mt-0">
                                        {s.duration_min} min / ${s.price.toLocaleString('es-CL')}
                                    </span>
                                </div>

                                <div className="flex gap-1 self-end sm:self-auto">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => onEdit(s)}
                                        disabled={loading}
                                        title="Editar"
                                    >
                                        <Edit className="h-4 w-4 text-blue-500" />
                                    </Button>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                disabled={loading}
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Estás a punto de eliminar el servicio <b>{s.name}</b>. Esta acción no se puede deshacer.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => onDelete(s.id, s.name)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
