import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { PlusCircle, Loader2, X } from 'lucide-react';
import { Service, ServicePayload, Category } from '@/types/services';

const serviceSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    duration_min: z.coerce.number().min(1, "La duración debe ser mayor a 0"),
    price: z.coerce.number().min(0, "El precio no puede ser negativo"),
    category: z.string().optional(),
    active: z.boolean().default(true),
});

interface ServiceFormProps {
    initialData?: Service | null;
    categories: Category[];
    loading: boolean;
    onSubmit: (values: ServicePayload) => Promise<void>;
    onCancel: () => void;
}

export default function ServiceForm({ initialData, categories, loading, onSubmit, onCancel }: ServiceFormProps) {
    const form = useForm<z.infer<typeof serviceSchema>>({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            name: '',
            duration_min: 60,
            price: 0,
            category: '',
            active: true
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                duration_min: initialData.duration_min,
                price: initialData.price,
                category: initialData.category || '',
                active: initialData.active ?? true
            });
        } else {
            form.reset({
                name: '',
                duration_min: 60,
                price: 0,
                category: '',
                active: true
            });
        }
    }, [initialData, form]);

    const handleSubmit = async (values: z.infer<typeof serviceSchema>) => {
        await onSubmit(values);
        if (!initialData) {
            form.reset();
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                        <PlusCircle className="h-5 w-5 mr-2" />
                        {initialData ? "Editar Servicio" : "Añadir Servicio"}
                    </div>
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardTitle>
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nombre del servicio" {...field} disabled={loading} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="duration_min"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Duración (min)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} disabled={loading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Precio</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} disabled={loading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoría</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={loading}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una categoría" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.name}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="active"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel>Estado</FormLabel>
                                        <div className="text-sm text-muted-foreground">
                                            {field.value ? "Activo (Visible)" : "Inactivo (Oculto)"}
                                        </div>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={loading}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <div className="flex gap-2 pt-2">
                            <Button type="submit" disabled={loading} className="flex-1">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {initialData ? "Actualizar" : "Crear Servicio"}
                            </Button>
                            {initialData && (
                                <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
                                    <X className="mr-2 h-4 w-4" /> Cancelar
                                </Button>
                            )}
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
