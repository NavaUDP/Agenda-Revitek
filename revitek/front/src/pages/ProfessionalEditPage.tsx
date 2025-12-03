import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
    getProfessional,
} from '@/api/profesionales';
import { Professional } from '@/types/professionals';
import {
    listWorkSchedules,
    generateSlots,
    listBlocks,
    SlotBlockData,
    listBreaks,
} from '@/api/agenda';
import { ArrowLeft, Calendar } from 'lucide-react';
import { toast } from 'sonner';

// Components
import ProfessionalProfileForm from '@/components/professionals/ProfessionalProfileForm';
import ProfessionalAccessForm from '@/components/professionals/ProfessionalAccessForm';
import ProfessionalScheduleManager, { WorkScheduleWithBreaks } from '@/components/professionals/ProfessionalScheduleManager';
import ProfessionalBlockManager from '@/components/professionals/ProfessionalBlockManager';

export default function ProfessionalEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // Data States
    const [professional, setProfessional] = useState<Professional | null>(null);
    const [schedules, setSchedules] = useState<WorkScheduleWithBreaks[]>([]);
    const [blocks, setBlocks] = useState<SlotBlockData[]>([]);

    useEffect(() => {
        if (id) {
            loadData(Number(id));
        }
    }, [id]);

    const loadData = async (profId: number) => {
        setLoading(true);
        try {
            const [profData, schedData, blockData] = await Promise.all([
                getProfessional(profId),
                listWorkSchedules(profId),
                listBlocks({ professional_id: profId })
            ]);
            setProfessional(profData);

            // Load breaks for each schedule
            const schedulesWithBreaks = await Promise.all(schedData.map(async (s) => {
                const breaks = await listBreaks(s.id);
                return { ...s, breaks: breaks.sort((a, b) => a.start_time.localeCompare(b.start_time)) };
            }));

            // Sort schedules by weekday
            setSchedules(schedulesWithBreaks.sort((a, b) => a.weekday - b.weekday));
            setBlocks(blockData);
        } catch (error) {
            console.error("Error loading professional data:", error);
            toast.error("Error al cargar datos del profesional");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateSlots = async () => {
        if (!professional) return;
        // We could use a Dialog here too, but prompt is simple for a date input for now.
        // Or we could implement a small Popover with a Calendar.
        // For simplicity in this refactor, let's keep prompt but wrap in try/catch with toast.
        const date = prompt("Ingresa la fecha de inicio (YYYY-MM-DD) para generar slots por 30 días:", new Date().toISOString().split('T')[0]);
        if (!date) return;

        try {
            await generateSlots(professional.id, date);
            toast.success('Slots generados correctamente');
        } catch (error) {
            console.error("Error generating slots:", error);
            toast.error('Error al generar slots');
        }
    };

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
                    <ProfessionalProfileForm
                        professional={professional}
                        onUpdate={(updated) => setProfessional(updated)}
                    />
                    <ProfessionalAccessForm
                        professional={professional}
                        onUpdate={() => loadData(professional.id)}
                    />
                </TabsContent>

                {/* --- TAB: HORARIO SEMANAL --- */}
                <TabsContent value="schedule">
                    <ProfessionalScheduleManager
                        professionalId={professional.id}
                        schedules={schedules}
                        onUpdate={() => loadData(professional.id)}
                    />
                </TabsContent>

                {/* --- TAB: BLOQUEOS --- */}
                <TabsContent value="blocks">
                    <ProfessionalBlockManager
                        professionalId={professional.id}
                        blocks={blocks}
                        onUpdate={() => loadData(professional.id)}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
