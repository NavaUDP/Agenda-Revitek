import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    getProfesional,
    updateProfesional,
    Professional
} from '@/api/profesionales';
import {
    listWorkSchedules,
    updateWorkSchedule,
    WorkSchedule,
    generateSlots,
    listBlocks,
    createBlock,
    deleteBlock,
    SlotBlockData,
    listBreaks,
    createBreak,
    deleteBreak,
    Break,
    createWorkSchedule
} from '@/api/agenda';
import { ArrowLeft, Save, Calendar, Clock, Ban, Trash2, Plus, Coffee } from 'lucide-react';

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Extended type to include breaks in the UI state
interface WorkScheduleWithBreaks extends WorkSchedule {
    breaks?: Break[];
}

export default function ProfessionalEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data States
    const [professional, setProfessional] = useState<Professional | null>(null);
    const [schedules, setSchedules] = useState<WorkScheduleWithBreaks[]>([]);
    const [blocks, setBlocks] = useState<SlotBlockData[]>([]);

    // Form States for Blocks
    const [newBlock, setNewBlock] = useState({ date: '', start: '', end: '', reason: '' });

    useEffect(() => {
        if (id) {
            loadData(Number(id));
        }
    }, [id]);

    const loadData = async (profId: number) => {
        setLoading(true);
        try {
            const [profData, schedData, blockData] = await Promise.all([
                getProfesional(profId),
                listWorkSchedules(profId),
                listBlocks({ professional_id: profId })
            ]);
            setProfessional(profData);

            // Load breaks for each schedule
            const schedulesWithBreaks = await Promise.all(schedData.map(async (s) => {
                const breaks = await listBreaks(s.id);
                return { ...s, breaks };
            }));

            // Sort schedules by weekday
            setSchedules(schedulesWithBreaks.sort((a, b) => a.weekday - b.weekday));
            setBlocks(blockData);
        } catch (error) {
            console.error("Error loading professional data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!professional) return;

        setSaving(true);
        try {
            await updateProfesional(professional.id, professional);
            alert('Perfil actualizado correctamente');
        } catch (error) {
            console.error("Error updating profile:", error);
            alert('Error al actualizar el perfil');
        } finally {
            setSaving(false);
        }
    };

    const handleScheduleUpdate = async (scheduleId: number, field: keyof WorkSchedule, value: any) => {
        // Optimistic update
        setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, [field]: value } : s));

        try {
            await updateWorkSchedule(scheduleId, { [field]: value });
        } catch (error) {
            console.error("Error updating schedule:", error);
            loadData(Number(id));
        }
    };

    const handleAddBreak = async (scheduleId: number) => {
        const start = prompt("Hora inicio del break (HH:MM)", "13:00");
        if (!start) return;
        const end = prompt("Hora fin del break (HH:MM)", "14:00");
        if (!end) return;

        try {
            const newBreak = await createBreak({
                work_schedule: scheduleId,
                start_time: start,
                end_time: end
            });

            setSchedules(prev => prev.map(s => {
                if (s.id === scheduleId) {
                    return { ...s, breaks: [...(s.breaks || []), newBreak].sort((a, b) => a.start_time.localeCompare(b.start_time)) };
                }
                return s;
            }));
        } catch (error) {
            console.error("Error adding break:", error);
            alert("Error al añadir break. Verifica el formato de hora.");
        }
    };

    const handleDeleteBreak = async (breakId: number, scheduleId: number) => {
        if (!confirm('¿Eliminar este break?')) return;
        try {
            await deleteBreak(breakId);
            setSchedules(prev => prev.map(s => {
                if (s.id === scheduleId) {
                    return { ...s, breaks: s.breaks?.filter(b => b.id !== breakId) };
                }
                return s;
            }));
        } catch (error) {
            console.error("Error deleting break:", error);
        }
    };

    const handleAddSchedule = async (weekday: number) => {
        if (!professional) return;
        setSaving(true);
        try {
            // Default to 14:00 for Saturday (5), 18:00 for others
            const defaultEndTime = weekday === 5 ? "14:00" : "18:00";

            const newSchedule = await createWorkSchedule({
                professional: professional.id,
                weekday: weekday,
                start_time: "09:00",
                end_time: defaultEndTime,
                active: true
            });
            // Reload to get breaks and sort
            loadData(professional.id);
        } catch (error) {
            console.error("Error creating schedule:", error);
            alert("Error al crear el horario.");
        } finally {
            setSaving(false);
        }
    };

    // Calculate missing weekdays
    const existingWeekdays = schedules.map(s => s.weekday);
    const missingWeekdays = [0, 1, 2, 3, 4, 5, 6].filter(day => !existingWeekdays.includes(day));

    const handleAddBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!professional || !newBlock.date || !newBlock.start || !newBlock.end) return;

        setSaving(true);
        try {
            const startDateTime = `${newBlock.date}T${newBlock.start}`;
            const endDateTime = `${newBlock.date}T${newBlock.end}`;

            await createBlock({
                professional: professional.id,
                date: newBlock.date,
                start: startDateTime,
                end: endDateTime,
                reason: newBlock.reason
            });

            const updatedBlocks = await listBlocks({ professional_id: professional.id });
            setBlocks(updatedBlocks);
            setNewBlock({ date: '', start: '', end: '', reason: '' });
        } catch (error) {
            console.error("Error creating block:", error);
            alert('Error al crear el bloqueo');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBlock = async (blockId: number) => {
        if (!confirm('¿Estás seguro de eliminar este bloqueo?')) return;
        try {
            await deleteBlock(blockId);
            setBlocks(prev => prev.filter(b => b.id !== blockId));
        } catch (error) {
            console.error("Error deleting block:", error);
        }
    };

    const handleGenerateSlots = async () => {
        if (!professional) return;
        const date = prompt("Ingresa la fecha de inicio (YYYY-MM-DD) para generar slots por 30 días:", new Date().toISOString().split('T')[0]);
        if (!date) return;

        setSaving(true);
        try {
            await generateSlots(professional.id, date);
            alert('Slots generados correctamente');
        } catch (error) {
            console.error("Error generating slots:", error);
            alert('Error al generar slots');
        } finally {
            setSaving(false);
        }
    };

    const quickReasons = ["Almuerzo", "Médico", "Trámite Personal", "Vacaciones", "Licencia"];

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-10 w-[400px]" />
                    <Skeleton className="h-[400px] w-full rounded-xl" />
                </div>
            </div>
        );
    }
    if (!professional) return <div className="p-8">Profesional no encontrado</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/profesionales')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">{professional.first_name} {professional.last_name}</h1>
                        <p className="text-muted-foreground">Gestión completa del profesional</p>
                    </div>
                </div>
                <Button onClick={handleGenerateSlots} variant="outline">
                    <Calendar className="mr-2 h-4 w-4" /> Generar Disponibilidad
                </Button>
            </div>

            <Tabs defaultValue="schedule" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="profile">Perfil</TabsTrigger>
                    <TabsTrigger value="schedule">Horario Semanal</TabsTrigger>
                    <TabsTrigger value="blocks">Bloqueos</TabsTrigger>
                </TabsList>

                {/* --- TAB: PERFIL --- */}
                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información Personal</CardTitle>
                            <CardDescription>Edita los datos básicos del profesional.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Nombre</label>
                                        <Input
                                            value={professional.first_name}
                                            onChange={e => setProfessional({ ...professional, first_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Apellido</label>
                                        <Input
                                            value={professional.last_name}
                                            onChange={e => setProfessional({ ...professional, last_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Email</label>
                                        <Input
                                            type="email"
                                            value={professional.email || ''}
                                            onChange={e => setProfessional({ ...professional, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Teléfono</label>
                                        <Input
                                            value={professional.phone || ''}
                                            onChange={e => setProfessional({ ...professional, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Color Calendario</label>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            type="color"
                                            className="w-12 h-10 p-1 cursor-pointer"
                                            value={professional.calendar_color || '#3b82f6'}
                                            onChange={e => setProfessional({ ...professional, calendar_color: e.target.value })}
                                        />
                                        <span className="text-sm text-muted-foreground">{professional.calendar_color}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Biografía</label>
                                    <textarea
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={professional.bio || ''}
                                        onChange={e => setProfessional({ ...professional, bio: e.target.value })}
                                        maxLength={2000}
                                    />
                                </div>
                                <Button type="submit" disabled={saving}>
                                    <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- TAB: HORARIO SEMANAL --- */}
                <TabsContent value="schedule">
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
                                                    <Button variant="ghost" size="sm" onClick={() => handleAddBreak(schedule.id)}>
                                                        <Plus className="h-3 w-3 mr-1" /> Añadir Break
                                                    </Button>
                                                </div>

                                                {schedule.breaks && schedule.breaks.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {schedule.breaks.map(br => (
                                                            <div key={br.id} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                                                                <span>{br.start_time.slice(0, 5)} - {br.end_time.slice(0, 5)}</span>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteBreak(br.id!, schedule.id)}>
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
                                                disabled={saving}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Agregar {WEEKDAYS[day]}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- TAB: BLOQUEOS --- */}
                <TabsContent value="blocks">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Nuevo Bloqueo</CardTitle>
                                <CardDescription>Bloquea un horario específico para que no pueda ser reservado.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddBlock} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Fecha</label>
                                        <Input
                                            type="date"
                                            required
                                            value={newBlock.date}
                                            onChange={e => setNewBlock({ ...newBlock, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Inicio</label>
                                            <Input
                                                type="time"
                                                required
                                                value={newBlock.start}
                                                onChange={e => setNewBlock({ ...newBlock, start: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Fin</label>
                                            <Input
                                                type="time"
                                                required
                                                value={newBlock.end}
                                                onChange={e => setNewBlock({ ...newBlock, end: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Motivo</label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {quickReasons.map(reason => (
                                                <Badge
                                                    key={reason}
                                                    variant="secondary"
                                                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                                    onClick={() => setNewBlock({ ...newBlock, reason })}
                                                >
                                                    {reason}
                                                </Badge>
                                            ))}
                                        </div>
                                        <Input
                                            placeholder="Escribe un motivo o selecciona uno..."
                                            value={newBlock.reason}
                                            onChange={e => setNewBlock({ ...newBlock, reason: e.target.value })}
                                        />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={saving}>
                                        <Ban className="mr-2 h-4 w-4" /> Crear Bloqueo
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Bloqueos Activos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {blocks.length === 0 && <p className="text-muted-foreground">No hay bloqueos registrados.</p>}
                                    {blocks.map(block => (
                                        <div key={block.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{new Date(block.date).toLocaleDateString()}</span>
                                                    {block.reason && <Badge variant="outline" className="text-xs">{block.reason}</Badge>}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {new Date(block.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                    {new Date(block.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteBlock(block.id!)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
