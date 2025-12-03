import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Ban, Trash2, Loader2 } from "lucide-react";
import { SlotBlockData, createBlock, deleteBlock } from "@/api/agenda";
import { toast } from "sonner";

interface ProfessionalBlockManagerProps {
    professionalId: number;
    blocks: SlotBlockData[];
    onUpdate: () => void;
}

const blockSchema = z.object({
    date: z.string().min(1, "La fecha es requerida"),
    start: z.string().min(1, "La hora de inicio es requerida"),
    end: z.string().min(1, "La hora de fin es requerida"),
    reason: z.string().optional(),
});

const quickReasons = ["Almuerzo", "Médico", "Trámite Personal", "Vacaciones", "Licencia"];

export default function ProfessionalBlockManager({ professionalId, blocks, onUpdate }: ProfessionalBlockManagerProps) {
    const [saving, setSaving] = useState(false);

    const form = useForm<z.infer<typeof blockSchema>>({
        resolver: zodResolver(blockSchema),
        defaultValues: {
            date: "",
            start: "",
            end: "",
            reason: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof blockSchema>) => {
        setSaving(true);
        try {
            const startDateTime = `${values.date}T${values.start}`;
            const endDateTime = `${values.date}T${values.end}`;

            await createBlock({
                professional: professionalId,
                date: values.date,
                start: startDateTime,
                end: endDateTime,
                reason: values.reason || ""
            });

            toast.success("Bloqueo creado exitosamente");
            onUpdate();
            form.reset();
        } catch (error) {
            console.error("Error creating block:", error);
            toast.error("Error al crear el bloqueo");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBlock = async (blockId: number) => {
        if (!confirm('¿Estás seguro de eliminar este bloqueo?')) return;
        try {
            await deleteBlock(blockId);
            onUpdate();
            toast.success("Bloqueo eliminado");
        } catch (error) {
            console.error("Error deleting block:", error);
            toast.error("Error al eliminar bloqueo");
        }
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Nuevo Bloqueo</CardTitle>
                    <CardDescription>Bloquea un horario específico para que no pueda ser reservado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="start"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Inicio</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="end"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fin</FormLabel>
                                            <FormControl>
                                                <Input type="time" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Motivo</FormLabel>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {quickReasons.map(reason => (
                                                <Badge
                                                    key={reason}
                                                    variant="secondary"
                                                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                                    onClick={() => field.onChange(reason)}
                                                >
                                                    {reason}
                                                </Badge>
                                            ))}
                                        </div>
                                        <FormControl>
                                            <Input placeholder="Escribe un motivo o selecciona uno..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                                Crear Bloqueo
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Bloqueos Activos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
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
    );
}
