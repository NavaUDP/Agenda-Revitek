// revitek/front/src/api/agenda.ts
import http from "./http";

export interface ReservaCliente {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;
}

export interface ReservaDetallada {
  id: number;
  estado: string;
  total_min: number;
  nota: string;
  created_at: string;
  cliente: ReservaCliente | null;
  vehiculos?: {
    id: number;
    patente: string;
    marca: string;
    modelo?: string;
    year?: number;
  }[];
  direcciones?: {
    id: number;
    alias: string;
    calle: string;
    numero: string;
    comuna: string;
    ciudad: string;
    notas_adicionales?: string;
  }[];
  servicios: {
    servicio_id: number;
    profesional_id: number;
    duracion_min_eff: number;
  }[];
  reservaslot: {
    slot_id_inicio: number | null;
    slot_id_fin: number | null;
    inicio: string | null;
    fin: string | null;
    profesional_id: number | null;
  } | null;
  cancelled_by: string | null;
}

export async function listSlots(params: { profesionalId?: number; fecha: string }) {
  const p: any = { fecha: params.fecha };
  if (typeof params.profesionalId !== 'undefined' && params.profesionalId !== null) p.profesional_id = params.profesionalId;
  const { data } = await http.get("/api/agenda/slots", { params: p });
  return data;
}

export async function getAggregatedAvailability(services: number[], fecha: string) {
  const { data } = await http.post('/api/agenda/availability', { services, fecha });
  return data;
}

// TIPO ACTUALIZADO con vehiculo y direccion
export type ReservaPayload = {
  cliente: { 
    nombre: string; 
    apellido: string;
    email: string; 
    telefono: string;
  };
  vehiculo?: {
    patente: string;
    marca: string;
    modelo?: string;
    year?: number;
  };
  direccion?: {
    direccion_completa: string;
    alias?: string;
    comuna?: string;
  };
  profesional_id: number;
  servicios: { servicio_id: number; profesional_id: number }[];
  slot_id: number;
  nota?: string;
};

export async function createReserva(payload: ReservaPayload) {
  const { data } = await http.post("/api/agenda/reservas/", payload);
  return data;
}

export async function getReserva(id: number): Promise<ReservaDetallada> {
  const { data } = await http.get(`/api/agenda/reservas/${id}/`);
  return data;
}

export async function listReservas(): Promise<ReservaDetallada[]> {
  const { data } = await http.get("/api/agenda/reservas/");
  return data;
}