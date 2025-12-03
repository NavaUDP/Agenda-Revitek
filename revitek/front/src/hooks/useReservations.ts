import { useState, useEffect, useCallback } from 'react';
import { listReservations, updateReservationStatus, cancelReservation, ReservationDetailed } from '@/api/agenda';
import { toast } from 'sonner';

export interface ReservationsFilters {
    date: string;
    status: string;
    professional_id: string;
    include_cancelled: boolean;
}

export function useReservations() {
    const [reservations, setReservations] = useState<ReservationDetailed[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<ReservationsFilters>({
        date: '',
        status: 'ALL',
        professional_id: 'ALL',
        include_cancelled: false
    });

    const loadReservations = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filters.date) params.date = filters.date;
            if (filters.status !== 'ALL') params.status = filters.status;
            if (filters.professional_id !== 'ALL') params.professional_id = Number(filters.professional_id);
            if (filters.include_cancelled) params.include_cancelled = true;

            const data = await listReservations(params);
            setReservations(data);
        } catch (error) {
            console.error("Error loading reservations:", error);
            toast.error("Error al cargar reservas");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadReservations();
    }, [loadReservations]);

    const updateStatus = async (id: number, newStatus: string) => {
        try {
            await updateReservationStatus(id, newStatus);
            toast.success(`Estado actualizado a ${newStatus}`);

            // Optimistic update
            setReservations(prev => prev.map(res =>
                res.id === id ? { ...res, status: newStatus } : res
            ));
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Error al actualizar estado");
            // Revert on error by reloading
            loadReservations();
        }
    };

    const cancel = async (id: number) => {
        try {
            await cancelReservation(id);
            toast.success("Reserva cancelada exitosamente");

            // Optimistic update
            setReservations(prev => prev.map(res =>
                res.id === id ? { ...res, status: 'CANCELLED' } : res
            ));
        } catch (error) {
            console.error("Error cancelling reservation:", error);
            toast.error("Error al cancelar reserva");
            loadReservations();
        }
    };

    return {
        reservations,
        loading,
        filters,
        setFilters,
        refresh: loadReservations,
        updateStatus,
        cancel
    };
}
