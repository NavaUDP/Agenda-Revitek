// revitek/front/src/pages/ProfessionalsPage.tsx
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { createProfesional, deleteProfesional, Profesional } from '@/api/profesionales'; // Importa funciones API
import { useState } from 'react'; // Importa useState para el loading local

// Ajusta el tipo de contexto para usar Profesional y string ID
type AdminContextType = {
    resources: { id: string; title: string; }[]; // Mantenemos el formato para FullCalendar por ahora
    setResources: React.Dispatch<React.SetStateAction<{ id: string; title: string; }[]>>;
    loading: boolean; // Recibe el estado de carga del layout
};

const ProfessionalsPage = () => {
    // Ahora el context también tiene 'loading'
    const { resources, setResources, loading: initialLoading } = useOutletContext<AdminContextType>();
    const [localLoading, setLocalLoading] = useState(false); // Loading para acciones de esta página

    const handleAddProfessional = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const input = form.elements.namedItem('professionalName') as HTMLInputElement;
        const name = input.value.trim();

        if (name) {
            setLocalLoading(true);
            try {
                const newProfessionalApi = await createProfesional({ nombre: name });
                // Mapea al formato esperado por el estado 'resources'
                const newResource = { id: String(newProfessionalApi.id), title: newProfessionalApi.nombre };
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
                        <form onSubmit={handleAddProfessional} className="flex space-x-2">
                            <Input name="professionalName" placeholder="Nombre del profesional" required disabled={isLoading} />
                            <Button type="submit" disabled={isLoading}>Añadir</Button>
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
                                <li key={res.id} className="flex justify-between items-center p-3 bg-muted rounded-md">
                                    <span className="font-medium">{res.title}</span>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteProfessional(res.id)} disabled={isLoading}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
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