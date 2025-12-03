import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Clock, Coffee, Plus, Trash2, Loader2 } from "lucide-react";
import { WorkSchedule, Break, updateWorkSchedule, createBreak, deleteBreak, createWorkSchedule } from "@/api/agenda";
import { toast } from "sonner";

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export interface WorkScheduleWithBreaks extends WorkSchedule {
    breaks?: Break[];
}

interface ProfessionalScheduleManagerProps {
    professionalId: number;
    schedules: WorkScheduleWithBreaks[];
    onUpdate: () => void;
}

export default function ProfessionalScheduleManager({ professionalId, schedules, onUpdate }: ProfessionalScheduleManagerProps) {
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    const setLoading = (key: string, isLoading: boolean) => {
        setLoadingMap(prev => ({ ...prev, [key]: isLoading }));
    };

    const handleScheduleUpdate = async (scheduleId: number, field: keyof WorkSchedule, value: any) => {
        const key = `sched-${scheduleId}`;
        setLoading(key, true);
        try {
            await updateWorkSchedule(scheduleId, { [field]: value });
            onUpdate(); // Refresh parent state
        } catch (error) {
            console.error("Error updating schedule:", error);
            toast.error("Error al actualizar el horario");
        } finally {
            setLoading(key, false);
        }
    };

    const handleAddBreak = async (scheduleId: number, start: string, end: string) => {
        const key = `break-add-${scheduleId}`;
        setLoading(key, true);
        try {
            await createBreak({
                work_schedule: scheduleId,
                start_time: start,
                end_time: end
            });
            onUpdate();
            toast.success("Break añadido");
        } catch (error) {
            console.error("Error adding break:", error);
            toast.error("Error al añadir break");
        } finally {
            setLoading(key, false);
        }
    };

    const handleDeleteBreak = async (breakId: number) => {
        if (!confirm('¿Eliminar este break?')) return;
        try {
            await deleteBreak(breakId);
            onUpdate();
            toast.success("Break eliminado");
        } catch (error) {
            console.error("Error deleting break:", error);
            toast.error("Error al eliminar break");
        }
    };

    const handleAddSchedule = async (weekday: number) => {
        const key = `add-day-${weekday}`;
        setLoading(key, true);
        try {
            const defaultEndTime = weekday === 5 ? "14:00" : "18:00";
            await createWorkSchedule({
                professional: professionalId,
                weekday: weekday,
                start_time: "09:00",
                end_time: defaultEndTime,
                active: true
            });
            onUpdate();
            toast.success(`${WEEKDAYS[weekday]} agregado`);
        } catch (error) {
            console.error("Error creating schedule:", error);
            toast.error("Error al crear el horario");
        } finally {
            setLoading(key, false);
        }
    };

    // Calculate missing weekdays
    const existingWeekdays = schedules.map(s => s.weekday);
    const missingWeekdays = [0, 1, 2, 3, 4, 5, 6].filter(day => !existingWeekdays.includes(day));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Horario Base Semanal</CardTitle>
                <CardDescription>
                    Configura los días de trabajo y añade <b>Breaks</b> para crear turnos cortados (ej: almuerzo).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {schedules.map((schedule) => (
                        <div key={schedule.id} className={`p-4 border rounded-lg ${schedule.active ? 'bg-card' : 'bg-muted/30'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-4 w-32">
                                    <Switch
                                        checked={schedule.active}
                                        onCheckedChange={(checked) => handleScheduleUpdate(schedule.id, 'active', checked)}
                                    />
                                    <span className={`font-medium ${!schedule.active && 'text-muted-foreground'}`}>
                                        {WEEKDAYS[schedule.weekday]}
                                    </span>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="time"
                                            className="w-32"
                                            value={schedule.start_time.slice(0, 5)}
                                            onChange={(e) => handleScheduleUpdate(schedule.id, 'start_time', e.target.value)}
                                            disabled={!schedule.active}
                                        />
                                    </div>
                                    <span className="text-muted-foreground">hasta</span>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            type="time"
                                            className="w-32"
                                            value={schedule.end_time.slice(0, 5)}
                                            onChange={(e) => handleScheduleUpdate(schedule.id, 'end_time', e.target.value)}
                                            disabled={!schedule.active}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Breaks Section */}
                            {schedule.active && (
                                <div className="ml-14 pl-4 border-l-2 border-muted space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-muted-foreground flex items-center">
                                            <Coffee className="h-3 w-3 mr-2" /> Breaks / Descansos
                                        </span>

                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <Plus className="h-3 w-3 mr-1" /> Añadir Break
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80">
                                                <div className="grid gap-4">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium leading-none">Nuevo Break</h4>
                                                        <p className="text-sm text-muted-foreground">Define el horario de descanso.</p>
                                                    </div>
                                                    <form onSubmit={(e) => {
                                                        e.preventDefault();
                                                        const formData = new FormData(e.currentTarget);
                                                        handleAddBreak(schedule.id, formData.get('start') as string, formData.get('end') as string);
                                                    }}>
                                                        <div className="grid gap-2">
                                                            <div className="grid grid-cols-3 items-center gap-4">
                                                                <Label htmlFor="start">Inicio</Label>
                                                                <Input id="start" name="start" type="time" defaultValue="13:00" className="col-span-2 h-8" required />
                                                            </div>
                                                            <div className="grid grid-cols-3 items-center gap-4">
                                                                <Label htmlFor="end">Fin</Label>
                                                                <Input id="end" name="end" type="time" defaultValue="14:00" className="col-span-2 h-8" required />
                                                            </div>
                                                        </div>
                                                        <Button type="submit" size="sm" className="w-full mt-4">Añadir</Button>
                                                    </form>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {schedule.breaks && schedule.breaks.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {schedule.breaks.map(br => (
                                                <div key={br.id} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                                                    <span>{br.start_time.slice(0, 5)} - {br.end_time.slice(0, 5)}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteBreak(br.id!)}>
                                                        <Trash2 className="h-3 w-3 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">Sin descansos configurados.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Missing Schedules Section */}
                {missingWeekdays.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                        <h3 className="text-sm font-medium mb-4">Días sin configurar</h3>
                        <div className="flex flex-wrap gap-2">
                            {missingWeekdays.map(day => (
                                <Button
                                    key={day}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddSchedule(day)}
                                    disabled={loadingMap[`add-day-${day}`]}
                                >
                                    {loadingMap[`add-day-${day}`] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                                    Agregar {WEEKDAYS[day]}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
