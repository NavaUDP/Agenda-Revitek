import http from "./http";

export async function listSlots(params: { profesionalId?: number; fecha: string }) {
  const p: any = { fecha: params.fecha };
  if (typeof params.profesionalId !== 'undefined' && params.profesionalId !== null) p.profesional_id = params.profesionalId;
  const { data } = await http.get("/api/agenda/slots", { params: p });
  return data;
}

export async function getAggregatedAvailability(services: number[], fecha: string) {
  // POST to server-side aggregated availability endpoint
  const { data } = await http.post('/api/agenda/availability', { services, fecha });
  return data;
}

export type ReservaPayload = {
  cliente?: { nombre?: string; email?: string; telefono?: string };
  titular_nombre?: string;
  titular_email?: string | null;
  titular_tel?: string;
  profesional_id: number;
  servicios: { servicio_id: number; profesional_id: number }[];
  slot_id: number;
  nota?: string;
};

export async function createReserva(payload: ReservaPayload) {
  const { data } = await http.post("/api/agenda/reservas", payload);
  return data;
}

export async function getReserva(id: number) {
  const { data } = await http.get(`/api/agenda/reservas/${id}`);
  return data;
}
