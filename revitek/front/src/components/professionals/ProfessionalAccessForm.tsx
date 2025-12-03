import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Lock, CheckCircle } from "lucide-react";
import { Professional, ProfessionalUserPayload } from "@/types/professionals";
import { createProfessionalUser, updateProfessionalPassword } from "@/api/profesionales";
import { toast } from "sonner";

interface ProfessionalAccessFormProps {
    professional: Professional;
    onUpdate: () => void;
}

const createUserSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

const changePasswordSchema = z.object({
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export default function ProfessionalAccessForm({ professional, onUpdate }: ProfessionalAccessFormProps) {
    const [saving, setSaving] = useState(false);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

    // Form for creating user
    const createUserForm = useForm<z.infer<typeof createUserSchema>>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            email: professional.email || "",
            password: "",
        },
    });

    // Form for changing password
    const changePasswordForm = useForm<z.infer<typeof changePasswordSchema>>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            password: "",
        },
    });

    const onCreateUser = async (values: z.infer<typeof createUserSchema>) => {
        setSaving(true);
        try {
            await createProfessionalUser(professional.id, values as ProfessionalUserPayload);
            toast.success("Usuario creado y vinculado exitosamente");
            onUpdate();
        } catch (error: any) {
            console.error("Error creating user:", error);
            const msg = error.response?.data?.detail || "Error al crear usuario";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const onChangePassword = async (values: z.infer<typeof changePasswordSchema>) => {
        setSaving(true);
        try {
            await updateProfessionalPassword(professional.id, values);
            toast.success("Contraseña actualizada correctamente");
            setIsPasswordDialogOpen(false);
            changePasswordForm.reset();
        } catch (error: any) {
            console.error("Error updating password:", error);
            const msg = error.response?.data?.detail || "Error al actualizar contraseña";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Lock className="mr-2 h-5 w-5" /> Acceso al Sistema
                </CardTitle>
                <CardDescription>
                    Gestiona las credenciales de acceso para que este profesional pueda entrar al sistema.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {professional.has_user ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md">
                        <h3 className="font-medium text-green-800 dark:text-green-300 flex items-center">
                            <CheckCircle className="mr-2 h-5 w-5" /> Acceso Habilitado
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                            Este profesional tiene un usuario vinculado: <strong>{professional.user_email}</strong>
                        </p>

                        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 bg-white hover:bg-gray-50 text-green-800 border-green-200"
                                >
                                    <Lock className="mr-2 h-3 w-3" /> Cambiar Contraseña
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Cambiar Contraseña</DialogTitle>
                                    <DialogDescription>
                                        Ingresa la nueva contraseña para el usuario {professional.user_email}.
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...changePasswordForm}>
                                    <form onSubmit={changePasswordForm.handleSubmit(onChangePassword)} className="space-y-4">
                                        <FormField
                                            control={changePasswordForm.control}
                                            name="password"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nueva Contraseña</FormLabel>
                                                    <FormControl>
                                                        <Input type="password" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <DialogFooter>
                                            <Button type="submit" disabled={saving}>
                                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Actualizar
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                ) : (
                    <Form {...createUserForm}>
                        <form onSubmit={createUserForm.handleSubmit(onCreateUser)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={createUserForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email de Acceso</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="email@ejemplo.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={createUserForm.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Contraseña</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="******" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Crear Acceso
                            </Button>
                        </form>
                    </Form>
                )}
            </CardContent>
        </Card>
    );
}
