import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Mail, Phone, Calendar } from "lucide-react";
import { Professional } from "@/types/professionals";
import { useNavigate } from "react-router-dom";
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

interface ProfessionalsListProps {
    professionals: Professional[];
    onDelete: (id: number) => void;
    loading: boolean;
}

export default function ProfessionalsList({ professionals, onDelete, loading }: ProfessionalsListProps) {
    const navigate = useNavigate();

    if (professionals.length === 0 && !loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Profesionales</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">No hay profesionales registrados.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Lista de Profesionales</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {professionals.map((prof) => (
                        <div key={prof.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-muted/50 rounded-lg border gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-lg">{prof.first_name} {prof.last_name}</span>
                                    {prof.calendar_color && (
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: prof.calendar_color }}
                                            title="Color en calendario"
                                        />
                                    )}
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                                    {prof.email && (
                                        <div className="flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            <span>{prof.email}</span>
                                        </div>
                                    )}
                                    {prof.phone && (
                                        <div className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            <span>+{prof.phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex space-x-2 self-end sm:self-auto">
                                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/profesionales/${prof.id}`)}>
                                    <Edit className="h-4 w-4 mr-2" /> Editar
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción eliminará al profesional <b>{prof.first_name} {prof.last_name}</b> permanentemente.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => onDelete(prof.id)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                Eliminar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
