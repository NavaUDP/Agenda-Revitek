// revitek/front/src/pages/ProfessionalsPage.tsx
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, PlusCircle, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createProfesional, deleteProfesional, Professional } from '@/api/profesionales'; // Importa funciones API
import { useState } from 'react'; // Importa useState para el loading local

// Ajusta el tipo de contexto para usar Profesional y string ID
type AdminContextType = {
    resources: { id: string; title: string; }[]; // Mantenemos el formato para FullCalendar por ahora
    setResources: React.Dispatch<React.SetStateAction<{ id: string; title: string; }[]>>;
    loading: boolean; // Recibe el estado de carga del layout
};

const ProfessionalsPage = () => {
    const navigate = useNavigate();
    // Ahora el context también tiene 'loading'
    const { resources, setResources, loading: initialLoading } = useOutletContext<AdminContextType>();
    const [localLoading, setLocalLoading] = useState(false); // Loading para acciones de esta página

    const handleAddProfessional = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;

        const firstNameInput = form.elements.namedItem('firstName') as HTMLInputElement;
        const lastNameInput = form.elements.namedItem('lastName') as HTMLInputElement;
        const emailInput = form.elements.namedItem('email') as HTMLInputElement;
        const phoneInput = form.elements.namedItem('phone') as HTMLInputElement;
        const colorInput = form.elements.namedItem('color') as HTMLInputElement;
        const bioInput = form.elements.namedItem('bio') as HTMLTextAreaElement;

        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();

        if (firstName && lastName) {
            setLocalLoading(true);
            try {
                const newProfessionalApi = await createProfesional({
                    first_name: firstName,
                    last_name: lastName,
                    email: emailInput.value.trim() || undefined,
                    phone: phoneInput.value.trim() || undefined,
                    calendar_color: colorInput.value || undefined,
                    bio: bioInput.value.trim() || undefined
                });

                // Mapea al formato esperado por el estado 'resources'
                const newResource = {
                    id: String(newProfessionalApi.id),
                    title: `${newProfessionalApi.first_name} ${newProfessionalApi.last_name}`.trim()
                };
                setResources(prev => [...prev, newResource]);
                form.reset();
            } catch (error) {
                console.error("Error adding professional:", error);
                // Aquí podrías mostrar un toast o mensaje de error
            } finally {
                setLocalLoading(false);
            }
        }
    };

    const handleDeleteProfessional = async (id: string) => {
        // Convierte el ID de string a número para la API
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) return;

        // Opcional: Confirmación antes de borrar
        if (!confirm(`¿Estás seguro de eliminar al profesional ${resources.find(r => r.id === id)?.title}?`)) {
            return;
        }

        setLocalLoading(true);
        try {
            await deleteProfesional(numericId);
            setResources(prev => prev.filter(res => res.id !== id));
        } catch (error) {
            console.error("Error deleting professional:", error);
            // Aquí podrías mostrar un toast o mensaje de error
        } finally {
            setLocalLoading(false);
        }
    };

    // Muestra un estado de carga inicial o local
    const isLoading = initialLoading || localLoading;

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-foreground mb-8">Gestionar Profesionales</h1>

            {isLoading && <p>Cargando...</p>}

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${isLoading ? 'opacity-50' : ''}`}>
                {/* Columna para añadir */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <PlusCircle className="h-5 w-5 mr-2" />
                            Añadir Nuevo Profesional
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddProfessional} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="firstName" className="text-sm font-medium">Nombre</label>
                                    <Input id="firstName" name="firstName" placeholder="Juan" required disabled={isLoading} />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="lastName" className="text-sm font-medium">Apellido</label>
                                    <Input id="lastName" name="lastName" placeholder="Pérez" required disabled={isLoading} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">Email</label>
                                <Input id="email" name="email" type="email" placeholder="juan@ejemplo.com" disabled={isLoading} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="phone" className="text-sm font-medium">Teléfono</label>
                                    <Input id="phone" name="phone" placeholder="+56 9 1234 5678" disabled={isLoading} />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="color" className="text-sm font-medium">Color Calendario</label>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            id="color"
                                            name="color"
                                            type="color"
                                            defaultValue="#3b82f6"
                                            className="w-12 h-10 p-1 cursor-pointer"
                                            disabled={isLoading}
                                        />
                                        <span className="text-xs text-muted-foreground">Selecciona un color</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="bio" className="text-sm font-medium">Biografía / Notas</label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Breve descripción del profesional..."
                                    maxLength={2000}
                                    disabled={isLoading}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Profesional
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Columna para listar */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Profesionales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {resources.length === 0 && !isLoading && (
                            <p className="text-muted-foreground">No hay profesionales registrados.</p>
                        )}
                        <ul className="space-y-3">
                            {resources.map(res => (
                                <li key={res.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-muted rounded-md gap-3">
                                    <span className="font-medium">{res.title}</span>
                                    <div className="flex space-x-2 self-end sm:self-auto">
                                        <Button variant="outline" size="icon" onClick={() => navigate(`/admin/profesionales/${res.id}`)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProfessional(res.id)} disabled={isLoading}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProfessionalsPage;