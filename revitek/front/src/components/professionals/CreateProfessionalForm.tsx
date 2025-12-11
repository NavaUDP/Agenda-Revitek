import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PlusCircle, Loader2 } from "lucide-react";
import { createProfessional } from "@/api/profesionales";
import { Professional, ProfessionalPayload } from "@/types/professionals";
import { toast } from "sonner";

const createProfessionalSchema = z.object({
    first_name: z.string().min(2, "El nombre es requerido"),
    last_name: z.string().min(2, "El apellido es requerido"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    phone: z.string().optional(),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional().or(z.literal("")),
    create_user_account: z.boolean().default(true),
    calendar_color: z.string().optional(),
    bio: z.string().max(2000, "La biografía es muy larga").optional(),
});

interface CreateProfessionalFormProps {
    onSuccess: (newProfessional: Professional) => void;
}

export default function CreateProfessionalForm({ onSuccess }: CreateProfessionalFormProps) {
    const [saving, setSaving] = useState(false);

    const form = useForm<z.infer<typeof createProfessionalSchema>>({
        resolver: zodResolver(createProfessionalSchema),
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            password: "",
            create_user_account: true,
            calendar_color: "#3b82f6",
            bio: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof createProfessionalSchema>) => {
        setSaving(true);
        try {
            const payload: ProfessionalPayload = {
                first_name: values.first_name,
                last_name: values.last_name,
                email: values.email || undefined,
                phone: values.phone ? (values.phone.startsWith('56') ? values.phone : `56${values.phone}`) : undefined,
                password: values.password || undefined,
                create_user_account: values.create_user_account,
                calendar_color: values.calendar_color,
                bio: values.bio || undefined,
                active: true,
                accepts_reservations: true
            };

            const newProfessional = await createProfessional(payload);
            
            if (values.create_user_account && values.email && values.password) {
                toast.success("Profesional y cuenta de acceso creados exitosamente");
            } else {
                toast.success("Profesional creado exitosamente");
            }
            
            form.reset();
            onSuccess(newProfessional);
        } catch (error) {
            console.error("Error creating professional:", error);
            toast.error("Error al crear el profesional");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Añadir Nuevo Profesional
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="first_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Juan" {...field} />
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
                                            <Input placeholder="Pérez" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email (Requerido para cuenta de acceso)</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="juan@ejemplo.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contraseña de Acceso (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="password" 
                                            placeholder="Mínimo 6 caracteres" 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Si proporcionas email y contraseña, se creará automáticamente una cuenta de acceso al sistema.
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
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
                                                    placeholder="9 1234 5678"
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
                                            <span className="text-xs text-muted-foreground">Selecciona un color</span>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Biografía / Notas</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Breve descripción del profesional..."
                                            className="min-h-[80px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Añadir Profesional
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
