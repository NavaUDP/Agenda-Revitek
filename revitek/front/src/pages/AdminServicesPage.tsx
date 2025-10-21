// ... (importaciones existentes) ...
import { useState, useEffect } from 'react';
import { listAllServicios, createServicio /*, updateServicio, deleteServicio*/ } from '@/api/servicios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit, PlusCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"; // Cambiado desde @/hooks/use-toast si es necesario

interface Servicio {
    id: number;
    nombre: string;
    categoria?: string;
    duracion_min: number;
    activo: boolean;
    precio: number; // <-- Añadido
}

const AdminServicesPage = () => {
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newServiceName, setNewServiceName] = useState('');
    const [newServiceDuration, setNewServiceDuration] = useState('');
    const [newServicePrice, setNewServicePrice] = useState(''); // <-- Nuevo estado para precio
    const { toast } = useToast();

    const fetchServicios = async () => {
        // ... (sin cambios) ...
        setLoading(true);
        setError(null);
        try {
            const data = await listAllServicios();
            setServicios(data);
        } catch (err) {
            setError('Error al cargar los servicios.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServicios();
    }, []);

    const handleAddService = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = newServiceName.trim();
        const duration = parseInt(newServiceDuration, 10);
        const price = parseInt(newServicePrice, 10); // <-- Obtener precio

        // Validar también el precio
        if (!name || isNaN(duration) || duration <= 0 || isNaN(price) || price < 0) {
            toast({ title: "Error", description: "Nombre, duración positiva y precio (>=0) son requeridos.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            // Incluir precio en el payload (asegúrate que createServicio lo acepte)
            await createServicio({ nombre: name, duracion_min: duration, precio: price }); // Descomenta cuando esté la API
            toast({ title: "Éxito", description: `Servicio "${name}" añadido.` });
            setNewServiceName('');
            setNewServiceDuration('');
            setNewServicePrice(''); 
            fetchServicios(); 

        } catch (err) {
            toast({ title: "Error", description: "No se pudo añadir el servicio.", variant: "destructive" });
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ... (handleDeleteService y handleEditService sin cambios relevantes ahora) ...
     const handleDeleteService = async (id: number, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar el servicio "${name}"?`)) {
            return;
        }
        setLoading(true);
        try {
            // await deleteServicio(id); // Descomenta cuando esté la API
            toast({ title: "Éxito", description: `Servicio "${name}" eliminado (simulado).` });
            // fetchServicios(); // Vuelve a cargar la lista
            // Simulación:
            setServicios(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            toast({ title: "Error", description: "No se pudo eliminar el servicio.", variant: "destructive" });
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditService = (id: number) => {
         toast({ title: "Info", description: `Editar servicio ID ${id} (no implementado).` });
    };


    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-foreground mb-8">Gestionar Servicios</h1>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${loading ? 'opacity-50' : ''}`}>
                {/* Columna para añadir */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <PlusCircle className="h-5 w-5 mr-2" />
                            Añadir Nuevo Servicio
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddService} className="space-y-4">
                            <Input
                                name="serviceName"
                                placeholder="Nombre del servicio"
                                value={newServiceName}
                                onChange={(e) => setNewServiceName(e.target.value)}
                                required
                                disabled={loading}
                            />
                            <Input
                                name="serviceDuration"
                                type="number"
                                placeholder="Duración (minutos)"
                                value={newServiceDuration}
                                onChange={(e) => setNewServiceDuration(e.target.value)}
                                required
                                min="1"
                                disabled={loading}
                            />
                            {/* ----- INICIO NUEVO INPUT PRECIO ----- */}
                            <Input
                                name="servicePrice"
                                type="number"
                                placeholder="Precio (ej: 25000)"
                                value={newServicePrice}
                                onChange={(e) => setNewServicePrice(e.target.value)}
                                required
                                min="0" // O 1 si no quieres precios gratis
                                disabled={loading}
                            />
                            {/* ----- FIN NUEVO INPUT PRECIO ----- */}
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Añadiendo...' : 'Añadir Servicio'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Columna para listar */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Servicios</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* ... (estados de carga y error) ... */}
                        {loading && !servicios.length && <p>Cargando servicios...</p>}
                        {error && <p className="text-destructive">{error}</p>}
                        {!loading && !error && servicios.length === 0 && (
                            <p className="text-muted-foreground">No hay servicios registrados.</p>
                        )}
                        <ul className="space-y-3 max-h-96 overflow-y-auto">
                            {servicios.map(s => (
                                <li key={s.id} className="flex justify-between items-center p-3 bg-muted rounded-md">
                                    <div>
                                        <span className="font-medium">{s.nombre}</span>
                                        {/* ----- INICIO MOSTRAR PRECIO ----- */}
                                        <span className="text-sm text-muted-foreground ml-2">
                                            ({s.duracion_min} min / ${s.precio?.toLocaleString('es-CL') ?? 'N/A'}) {/* Formato chileno */}
                                        </span>
                                         {/* ----- FIN MOSTRAR PRECIO ----- */}
                                    </div>
                                    <div className="flex space-x-1">
                                         <Button variant="ghost" size="icon" onClick={() => handleEditService(s.id)} disabled={loading} title="Editar">
                                            <Edit className="h-4 w-4 text-blue-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteService(s.id, s.nombre)} disabled={loading} title="Eliminar">
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

export default AdminServicesPage;