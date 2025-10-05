import { useState, useCallback } from "react";
import { listProfesionales } from "../api/profesionales";
import { listServicios } from "../api/servicios";
import { listSlots, createReserva, getReserva, type ReservaPayload } from "../api/agenda";
import { getEstadoReserva } from "../api/estados";

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
    listProfesionales: () => wrap(listProfesionales),
    listServicios: (profId: number) => wrap(() => listServicios(profId)),
    listSlots: (profId: number, fecha: string) => wrap(() => listSlots({ profesionalId: profId, fecha })),
    createReserva: (payload: ReservaPayload) => wrap(() => createReserva(payload)),
    getReserva: (id: number) => wrap(() => getReserva(id)),
    getEstadoReserva: (id: number) => wrap(() => getEstadoReserva(id)),
  };
}
