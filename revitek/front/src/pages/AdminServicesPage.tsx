import { useState, useEffect } from 'react';
import { listAllServicios, createServicio, updateServicio, deleteServicio, type ServicioPayload } from '@/api/servicios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit, PlusCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"; 


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

    const [editingId, setEditingId] = useState<number | null>(null);

    const fetchServicios = async () => {
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

    const resetForm = () => {
        setNewServiceName('');
        setNewServiceDuration('');
        setNewServicePrice('');
        setEditingId(null);
    };

    const handleSubmitService = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nombre = newServiceName.trim();
        const duracion_min = parseInt(newServiceDuration, 10);
        const precio = parseInt(newServicePrice, 10);

        if (!nombre || isNaN(duracion_min) || duracion_min <= 0 || isNaN(precio) || precio < 0) {
            toast({ title: "Error", description: "Nombre, duración positiva y precio (>=0) son requeridos.", variant: "destructive" });
            return;
        }

        // Usamos nuestro tipo de payload
        const payload: ServicioPayload = { nombre, duracion_min, precio };
        setLoading(true);

        try {
            if (editingId) {
                // --- LÓGICA DE ACTUALIZAR ---
                await updateServicio(editingId, payload);
                toast({ title: "Éxito", description: `Servicio "${nombre}" actualizado.` });
            } else {
                // --- LÓGICA DE CREAR ---
                await createServicio(payload);
                toast({ title: "Éxito", description: `Servicio "${nombre}" añadido.` });
            }
            resetForm(); // Limpiamos el formulario
            fetchServicios(); // Recargamos la lista

        } catch (err: any) {
            const errorMsg = err?.response?.data?.nombre?.[0] || (editingId ? 'actualizar' : 'añadir');
            toast({ 
                title: "Error", 
                description: `No se pudo ${editingId ? 'actualizar' : 'añadir'} el servicio. ${errorMsg}`, 
                variant: "destructive" 
            });
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // 5. ACTUALIZAMOS EL HANDLER DE ELIMINAR (para que use la API real)
    const handleDeleteService = async (id: number, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar el servicio "${name}"? Esta acción no se puede deshacer.`)) {
            return;
        }
        setLoading(true);
        try {
            await deleteServicio(id); // <-- USANDO API REAL
            toast({ title: "Éxito", description: `Servicio "${name}" eliminado.` });
            fetchServicios(); // Vuelve a cargar la lista
            
            // Si estábamos editando el servicio que se borró, limpiamos el form
            if (editingId === id) {
                resetForm();
            }
        } catch (err) {
            toast({ title: "Error", description: "No se pudo eliminar el servicio. Es posible que esté asignado a un profesional.", variant: "destructive" });
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // 6. ACTUALIZAMOS EL HANDLER DE EDITAR (para poblar el formulario)
    const handleEditService = (servicio: Servicio) => {
         setEditingId(servicio.id);
         setNewServiceName(servicio.nombre);
         setNewServiceDuration(String(servicio.duracion_min));
         setNewServicePrice(String(servicio.precio));
         
         // Opcional: hacer scroll hacia el formulario
         window.scrollTo({ top: 0, behavior: 'smooth' });
    };


    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-foreground mb-8">Gestionar Servicios</h1>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${loading && !editingId ? 'opacity-50' : ''}`}>
                {/* Columna para añadir/editar */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <PlusCircle className="h-5 w-5 mr-2" />
                            {/* 7. TÍTULO DINÁMICO */}
                            {editingId ? 'Editar Servicio' : 'Añadir Nuevo Servicio'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* 8. APUNTAMOS AL NUEVO HANDLER */}
                        <form onSubmit={handleSubmitService} className="space-y-4">
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
                            <Input
                                name="servicePrice"
                                type="number"
                                placeholder="Precio (ej: 25000)"
                                value={newServicePrice}
                                onChange={(e) => setNewServicePrice(e.target.value)}
                                required
                                min="0" 
                                disabled={loading}
                            />
                            
                            {/* 9. BOTONES DINÁMICOS */}
                            <div className="flex space-x-2">
                                <Button type="submit" disabled={loading} className="flex-1">
                                    {loading ? 'Guardando...' : (editingId ? 'Actualizar Servicio' : 'Añadir Servicio')}
                                </Button>
                                {editingId && (
                                    <Button variant="outline" type="button" onClick={resetForm} disabled={loading}>
                                        Cancelar Edición
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Columna para listar */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Servicios</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                                        <span className="text-sm text-muted-foreground ml-2">
                                            ({s.duracion_min} min / ${s.precio?.toLocaleString('es-CL') ?? 'N/A'})
                                        </span>
                                    </div>
                                    <div className="flex space-x-1">
                                         {/* 10. CONECTAMOS LOS BOTONES DE LA LISTA */}
                                         <Button variant="ghost" size="icon" onClick={() => handleEditService(s)} disabled={loading} title="Editar">
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