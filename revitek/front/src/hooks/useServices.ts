import { useState, useEffect, useCallback } from 'react';
import {
    listAllServices,
    createService,
    updateService,
    deleteService,
    listCategories
} from '@/api/servicios';
import { Service, ServicePayload, Category } from '@/types/services';
import { toast } from 'sonner';

export function useServices(options: { publicOnly?: boolean } = {}) {
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // If publicOnly is true, we don't pass include_inactive=true
            const params = options.publicOnly ? {} : { include_inactive: true };

            const [servicesData, categoriesData] = await Promise.all([
                listAllServices(params),
                listCategories()
            ]);
            setServices(servicesData);
            setCategories(categoriesData);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Error al cargar los servicios.");
            toast.error("No se pudieron cargar los servicios.");
        } finally {
            setLoading(false);
        }
    }, [options.publicOnly]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const addService = async (payload: ServicePayload) => {
        setLoading(true);
        try {
            const newService = await createService(payload);
            toast.success(`Servicio "${newService.name}" creado exitosamente`);
            await fetchData(); // Refresh list
            return newService;
        } catch (err: any) {
            console.error(err);
            const msg = err?.response?.data?.detail || "Error al crear servicio";
            toast.error(typeof msg === 'string' ? msg : "Error desconocido");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const editService = async (id: number, payload: ServicePayload) => {
        setLoading(true);
        try {
            const updatedService = await updateService(id, payload, { include_inactive: true });
            toast.success(`Servicio "${updatedService.name}" actualizado`);
            await fetchData(); // Refresh list
            return updatedService;
        } catch (err: any) {
            console.error(err);
            const msg = err?.response?.data?.detail || "Error al actualizar servicio";
            toast.error(typeof msg === 'string' ? msg : "Error desconocido");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const removeService = async (id: number, name: string) => {
        setLoading(true);
        try {
            await deleteService(id, { include_inactive: true });
            toast.success(`Servicio "${name}" eliminado`);
            setServices(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error(err);
            toast.error("No se pudo eliminar el servicio. Puede tener reservas asociadas.");
        } finally {
            setLoading(false);
        }
    };

    return {
        services,
        categories,
        loading,
        error,
        refresh: fetchData,
        addService,
        editService,
        removeService
    };
}
