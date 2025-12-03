import { useOutletContext } from 'react-router-dom';
import { listProfessionals, deleteProfessional } from '@/api/profesionales';
import { useState, useEffect } from 'react';
import { Professional } from '@/types/professionals';
import { toast } from 'sonner';

// Components
import CreateProfessionalForm from '@/components/professionals/CreateProfessionalForm';
import ProfessionalsList from '@/components/professionals/ProfessionalsList';

// Context type from AdminLayout
type AdminContextType = {
    resources: { id: string; title: string; }[];
    setResources: React.Dispatch<React.SetStateAction<{ id: string; title: string; }[]>>;
    loading: boolean;
};

const ProfessionalsPage = () => {
    const { setResources } = useOutletContext<AdminContextType>();
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProfessionals = async () => {
        setLoading(true);
        try {
            const data = await listProfessionals();
            setProfessionals(data);

            // Sync with AdminLayout context
            const resourcesData = data.map(p => ({
                id: String(p.id),
                title: `${p.first_name} ${p.last_name}`.trim()
            }));
            setResources(resourcesData);
        } catch (error) {
            console.error("Error fetching professionals:", error);
            toast.error("Error al cargar profesionales");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfessionals();
    }, []);

    const handleSuccessCreate = (newProfessional: Professional) => {
        // Optimistically update list and context
        const updatedList = [...professionals, newProfessional];
        setProfessionals(updatedList);

        setResources(prev => [...prev, {
            id: String(newProfessional.id),
            title: `${newProfessional.first_name} ${newProfessional.last_name}`.trim()
        }]);
    };

    const handleDeleteProfessional = async (id: number) => {
        try {
            await deleteProfessional(id);

            // Optimistically update list and context
            setProfessionals(prev => prev.filter(p => p.id !== id));
            setResources(prev => prev.filter(r => r.id !== String(id)));

            toast.success("Profesional eliminado correctamente");
        } catch (error) {
            console.error("Error deleting professional:", error);
            toast.error("Error al eliminar profesional");
            // Re-fetch to ensure consistency if error occurred
            fetchProfessionals();
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-foreground mb-8">Gestionar Profesionales</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Columna para añadir */}
                <CreateProfessionalForm onSuccess={handleSuccessCreate} />

                {/* Columna para listar */}
                <ProfessionalsList
                    professionals={professionals}
                    onDelete={handleDeleteProfessional}
                    loading={loading}
                />
            </div>
        </div>
    );
};

export default ProfessionalsPage;