import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { listProfessionals } from '@/api/profesionales';
import { Professional } from '@/types/professionals';
import { Search } from 'lucide-react';
import { ReservationDetailsModal } from '@/components/ReservationDetailsModal';
import { ReservationDetailed } from '@/api/agenda';

// Hooks & Components
import { useReservations } from '@/hooks/useReservations';
import ReservationsFilter from '@/components/reservations/ReservationsFilter';
import ReservationsTable from '@/components/reservations/ReservationsTable';

export default function ReservationsPage() {
    const {
        reservations,
        loading,
        filters,
        setFilters,
        refresh,
        updateStatus,
        cancel
    } = useReservations();

    const [professionals, setProfessionals] = useState<Professional[]>([]);

    // Modal State
    const [selectedReservation, setSelectedReservation] = useState<ReservationDetailed | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadProfessionals();
    }, []);

    const loadProfessionals = async () => {
        try {
            const profs = await listProfessionals();
            setProfessionals(profs);
        } catch (error) {
            console.error("Error loading professionals:", error);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Gestión de Reservas</h1>
                    <p className="text-muted-foreground">Administra todas las citas del sistema.</p>
                </div>
                <Button onClick={refresh} variant="outline">
                    <Search className="mr-2 h-4 w-4" /> Actualizar
                </Button>
            </div>

            <ReservationsFilter
                filters={filters}
                setFilters={setFilters}
                professionals={professionals}
                onRefresh={refresh}
            />

            <ReservationsTable
                reservations={reservations}
                professionals={professionals}
                loading={loading}
                onStatusChange={updateStatus}
                onCancel={cancel}
                onViewDetails={(res) => {
                    setSelectedReservation(res);
                    setIsModalOpen(true);
                }}
            />

            <ReservationDetailsModal
                reserva={selectedReservation}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
}
