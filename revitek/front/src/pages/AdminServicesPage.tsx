import { useState, useEffect } from 'react';
import {
    listAllServicios,
    createServicio,
    updateServicio,
    deleteServicio,
    type ServicioPayload,
    listCategories,
    Category
} from '@/api/servicios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, Edit, PlusCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

interface Servicio {
    id: number;
    name: string;
    category?: string;
    duration_min: number;
    active: boolean;
    price: number;
}

const AdminServicesPage = () => {
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newName, setNewName] = useState('');
    const [newDuration, setNewDuration] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newCategory, setNewCategory] = useState('');

    const [editingId, setEditingId] = useState<number | null>(null);

    const [newActive, setNewActive] = useState(true);

    const { toast } = useToast();

    // -------------------------
    // Cargar servicios del backend
    // -------------------------
    const fetchServicios = async () => {
        try {
            setLoading(true);
            const [serviciosData, categoriesData] = await Promise.all([
                listAllServicios({ include_inactive: true }),
                listCategories()
            ]);
            setServicios(serviciosData);
            setCategories(categoriesData);
        } catch (err) {
            console.error(err);
            setError("Error al cargar los servicios.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServicios();
    }, []);

    const resetForm = () => {
        setNewName('');
        setNewDuration('');
        setNewPrice('');
        setNewCategory('');
        setNewActive(true);
        setEditingId(null);
    };

    // -------------------------
    // Crear o actualizar servicio
    // -------------------------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const name = newName.trim();
        const duration_min = Number(newDuration);
        const price = Number(newPrice);

        if (!name || duration_min <= 0 || price < 0) {
            toast({
                title: "Error",
                description: "Nombre, duración (>0) y precio (>=0) son obligatorios.",
                variant: "destructive"
            });
            return;
        }

        const payload: ServicioPayload = {
            name,
            duration_min,
            price,
            category: newCategory,
            active: newActive
        };

        setLoading(true);

        try {
            if (editingId) {
                await updateServicio(editingId, payload, { include_inactive: true });
                toast({ title: "Servicio actualizado", description: `Se actualizó "${name}".` });
            } else {
                await createServicio(payload);
                toast({ title: "Servicio creado", description: `Se agregó "${name}".` });
            }

            resetForm();
            fetchServicios();

        } catch (err: any) {
            const msg = err?.response?.data || "Error inesperado";
            toast({
                title: "Error al guardar",
                description: JSON.stringify(msg),
                variant: "destructive"
            });
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // -------------------------
    // Eliminar servicio
    // -------------------------
    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`¿Eliminar el servicio "${name}"?`)) return;

        setLoading(true);

        try {
            await deleteServicio(id, { include_inactive: true });
            toast({ title: "Eliminado", description: `El servicio "${name}" se eliminó.` });
            fetchServicios();

            if (editingId === id) resetForm();

        } catch (err) {
            toast({
                title: "Error eliminando",
                description: "Puede estar asignado a un profesional.",
                variant: "destructive"
            });
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // -------------------------
    // Editar servicio (cargar datos al form)
    // -------------------------
    const handleEdit = (s: Servicio) => {
        setEditingId(s.id);
        setNewName(s.name);
        setNewDuration(String(s.duration_min));
        setNewPrice(String(s.price));
        setNewCategory(s.category || '');
        setNewActive(s.active);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-8">Gestionar Servicios</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* FORMULARIO */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <PlusCircle className="h-5 w-5 mr-2" />
                            {editingId ? "Editar Servicio" : "Añadir Servicio"}
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre</label>
                                <Input
                                    placeholder="Nombre del servicio"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Duración (min)</label>
                                    <Input
                                        placeholder="60"
                                        type="number"
                                        value={newDuration}
                                        min={1}
                                        onChange={(e) => setNewDuration(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Precio</label>
                                    <Input
                                        placeholder="25000"
                                        type="number"
                                        value={newPrice}
                                        min={0}
                                        onChange={(e) => setNewPrice(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Categoría</label>
                                <Select value={newCategory} onValueChange={setNewCategory} disabled={loading}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.name}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={newActive}
                                    onCheckedChange={setNewActive}
                                    disabled={loading}
                                />
                                <span className="text-sm font-medium">
                                    {newActive ? "Activo (Visible)" : "Inactivo (Oculto)"}
                                </span>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={loading} className="flex-1">
                                    {editingId ? "Actualizar" : "Crear Servicio"}
                                </Button>
                                {editingId && (
                                    <Button type="button" variant="outline" disabled={loading} onClick={resetForm}>
                                        Cancelar
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* LISTA */}
                <Card>
                    <CardHeader>
                        <CardTitle>Servicios Registrados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading && !servicios.length && <p>Cargando servicios...</p>}
                        {error && <p className="text-destructive">{error}</p>}

                        <ul className="space-y-3 max-h-96 overflow-y-auto">
                            {servicios.map(s => (
                                <li key={s.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md gap-3 ${s.active ? 'bg-card' : 'bg-muted/50 opacity-70'}`}>
                                    <div className="w-full sm:w-auto">
                                        <div className="flex items-center justify-between sm:justify-start gap-2">
                                            <span className="font-semibold">{s.name}</span>
                                            {!s.active && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                                        </div>
                                        <span className="text-sm text-muted-foreground block mt-1 sm:mt-0">
                                            {s.duration_min} min / ${s.price.toLocaleString('es-CL')}
                                        </span>
                                    </div>

                                    <div className="flex gap-1 self-end sm:self-auto">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEdit(s)}
                                            disabled={loading}
                                        >
                                            <Edit className="h-4 w-4 text-blue-500" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(s.id, s.name)}
                                            disabled={loading}
                                        >
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
