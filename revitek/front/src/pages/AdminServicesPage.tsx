import { useState } from 'react';
import { Service, ServicePayload } from '@/types/services';
import { useServices } from '@/hooks/useServices';
import ServiceForm from '@/components/services/ServiceForm';
import ServicesList from '@/components/services/ServicesList';

const AdminServicesPage = () => {
    const {
        services,
        categories,
        loading,
        error,
        addService,
        editService,
        removeService
    } = useServices();

    const [editingService, setEditingService] = useState<Service | null>(null);

    const handleSubmit = async (values: ServicePayload) => {
        if (editingService) {
            await editService(editingService.id, values);
            setEditingService(null);
        } else {
            await addService(values);
        }
    };

    const handleEdit = (service: Service) => {
        setEditingService(service);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleCancelEdit = () => {
        setEditingService(null);
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-8">Gestionar Servicios</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* FORMULARIO */}
                <ServiceForm
                    initialData={editingService}
                    categories={categories}
                    loading={loading}
                    onSubmit={handleSubmit}
                    onCancel={handleCancelEdit}
                />

                {/* LISTA */}
                <ServicesList
                    services={services}
                    loading={loading}
                    error={error}
                    onEdit={handleEdit}
                    onDelete={removeService}
                />
            </div>
        </div>
    );
};

export default AdminServicesPage;
