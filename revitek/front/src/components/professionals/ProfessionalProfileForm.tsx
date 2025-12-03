import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Save } from "lucide-react";
import { Professional, ProfessionalPayload } from "@/types/professionals";
import { updateProfessional } from "@/api/profesionales";
import { toast } from "sonner";
import { useState } from "react";

const profileSchema = z.object({
    first_name: z.string().min(2, "El nombre es requerido"),
    last_name: z.string().min(2, "El apellido es requerido"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    phone: z.string().optional(),
    calendar_color: z.string().optional(),
    bio: z.string().max(2000, "La biografía es muy larga").optional(),
});

interface ProfessionalProfileFormProps {
    professional: Professional;
    onUpdate: (updated: Professional) => void;
}

export default function ProfessionalProfileForm({ professional, onUpdate }: ProfessionalProfileFormProps) {
    const [saving, setSaving] = useState(false);

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            first_name: professional.first_name,
            last_name: professional.last_name,
            email: professional.email || "",
            phone: professional.phone?.replace(/^56/, '') || "", // Strip 56 for display
            calendar_color: professional.calendar_color || "#3b82f6",
            bio: professional.bio || "",
        },
    });

    const onSubmit = async (values: z.infer<typeof profileSchema>) => {
        setSaving(true);
        try {
            // Prepare payload
            const payload: Partial<ProfessionalPayload> = {
                ...values,
                // Ensure phone has 56 prefix if not empty
                phone: values.phone ? (values.phone.startsWith('56') ? values.phone : `56${values.phone}`) : undefined
            };

            const updated = await updateProfessional(professional.id, payload);
            onUpdate(updated);
            toast.success("Perfil actualizado correctamente");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Error al actualizar el perfil");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Edita los datos básicos del profesional.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="first_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="last_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Apellido</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Teléfono</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center">
                                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm h-10">
                                                    +56
                                                </span>
                                                <Input
                                                    {...field}
                                                    className="rounded-l-none"
                                                    maxLength={9}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                                                        field.onChange(val);
                                                    }}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="calendar_color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Color Calendario</FormLabel>
                                    <div className="flex items-center space-x-2">
                                        <FormControl>
                                            <Input
                                                type="color"
                                                className="w-12 h-10 p-1 cursor-pointer"
                                                {...field}
                                            />
                                        </FormControl>
                                        <span className="text-sm text-muted-foreground">{field.value}</span>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Biografía</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Cambios
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
