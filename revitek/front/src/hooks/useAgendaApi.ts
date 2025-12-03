import { useState, useCallback } from "react";
import { listProfessionals } from "../api/profesionales";
import { listAllServices } from "../api/servicios";
import { listSlots, createReservation, getReservation, type ReservationPayload } from "../api/agenda";


export function useAgendaApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrap = useCallback(async <T,>(fn: () => Promise<T>) => {
    setLoading(true); setError(null);
    try { return await fn(); }
    catch (e: any) { setError(e?.response?.data ? JSON.stringify(e.response.data) : e.message); throw e; }
    finally { setLoading(false); }
  }, []);

  return {
    loading, error,
    listProfesionales: () => wrap(listProfessionals),
    listServicios: (profId: number) => wrap(() => listAllServices({ include_inactive: false })), // Assuming default behavior, or check usage
    listSlots: (profId: number, fecha: string) => wrap(() => listSlots({ professionalId: profId, date: fecha })),
    createReserva: (payload: ReservationPayload) => wrap(() => createReservation(payload)),
    getReserva: (id: number) => wrap(() => getReservation(id)),

  };
}
