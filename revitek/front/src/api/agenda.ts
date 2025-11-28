// ===== agenda.ts =====
// src/api/agenda.ts
import http from "./http";

// ---------------------------
// TYPES
// ---------------------------
export interface ReservaCliente {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface ReservaDetallada {
  id: number;
  status: string;
  total_min: number;
  note: string;
  created_at: string;
  cancelled_by: string | null;

  services: {
    service_id: number;
    service_name: string;
    professional_id: number;
    effective_duration_min: number;
  }[];

  slots_summary: {
    slot_id_start: number;
    slot_id_end: number;
    start: string;
    end: string;
    professional_id: number;
  } | null;

  client_info: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
  } | null;

  address: {
    id: number;
    alias: string;
    street: string;
    number: string;
    commune: string;
    region: string;
    complement?: string;
    notes?: string;
  } | null;

  vehicle: {
    id: number;
    license_plate: string;
    brand: string;
    model: string;
    year?: number;
  } | null;

  client_addresses: {
    id: number;
    alias: string;
    street: string;
    number: string;
    commune: string;
    region: string;
    complement?: string;
    notes?: string;
  }[];

  client_vehicles: {
    id: number;
    license_plate: string;
    brand: string;
    model: string;
    year?: number;
  }[];
}

export interface Slot {
  id: number;
  professional: number;
  date: string;
  start: string;
  end: string;
  status: string;
}

// ---------------------------
// SLOTS
// ---------------------------
export async function listSlots(params: {
  professionalId?: number;
  date: string;
}) {
  const q: any = { date: params.date };
  if (params.professionalId) q.professional_id = params.professionalId;

  const { data } = await http.get("/agenda/slots/", { params: q });
  return data;
}

// ---------------------------
// RESERVAS
// ---------------------------
export type ReservaPayload = {
  client: {
    first_name: string;
    last_name?: string;
    email: string;
    phone: string;
  };
  vehicle?: {
    license_plate: string;
    brand: string;
    model?: string;
    year?: number;
  };
  address?: {
    street: string;
    number: string;
    commune_id: number;
    alias?: string;
    notes?: string;
  };
  professional_id: number;
  services: { service_id: number; professional_id: number }[];
  slot_id: number;
  note?: string;
  recaptcha_token?: string;
};

export async function createReserva(payload: ReservaPayload) {
  const { data } = await http.post("/agenda/reservations/", payload);
  return data;
}

export async function getReserva(id: number): Promise<ReservaDetallada> {
  const { data } = await http.get(`/agenda/reservations/${id}/`);
  return data;
}

export async function listReservas(): Promise<ReservaDetallada[]> {
  const { data } = await http.get("/agenda/reservations/");
  return data;
}

export async function cancelReserva(id: number) {
  const { data } = await http.post(`/agenda/reservations/${id}/cancel/`, {
    by: "admin",
  });
  return data;
}

export async function updateReservaStatus(id: number, status: string) {
  const { data } = await http.patch(`/agenda/reservations/${id}/`, { status });
  return data;
}

// ---------------------------
// BLOQUEOS
// ---------------------------
export interface SlotBlockData {
  id?: number;
  professional: number;
  date: string;
  start: string;
  end: string;
  reason?: string;
  created_at?: string;
}

export async function listBlocks(params?: {
  date?: string;
  professional_id?: number;
}): Promise<SlotBlockData[]> {
  const { data } = await http.get("/agenda/blocks/", { params });
  return data;
}

export async function createBlock(
  payload: Omit<SlotBlockData, "id" | "created_at">
): Promise<SlotBlockData> {
  const { data } = await http.post("/agenda/blocks/create/", payload);
  return data;
}

export async function updateBlock(
  id: number,
  payload: Partial<SlotBlockData>
): Promise<SlotBlockData> {
  const { data } = await http.put(`/agenda/blocks/${id}/update/`, payload);
  return data;
}

export async function deleteBlock(id: number): Promise<void> {
  await http.delete(`/agenda/blocks/${id}/delete/`);
}

// ---------------------------
// DISPONIBILIDAD AGREGADA
// ---------------------------
export async function getAggregatedAvailability(
  services: number[],
  fecha: string
) {
  const { data } = await http.post("/agenda/availability/", {
    services,
    date: fecha,
  });
  return data;
}

// ---------------------------
// HORARIOS (WorkSchedule)
// ---------------------------
export interface WorkSchedule {
  id: number;
  professional: number;
  weekday: number; // 0=Monday, 6=Sunday
  start_time: string; // "HH:MM:SS"
  end_time: string;   // "HH:MM:SS"
  active: boolean;
}

export async function listWorkSchedules(professionalId: number): Promise<WorkSchedule[]> {
  const { data } = await http.get("/agenda/work-schedules/", {
    params: { professional: professionalId } // Assuming backend filters by this param or we filter client-side if needed, but standard ViewSet usually needs filter backend setup. 
    // Note: The backend WorkScheduleViewSet might not have filter_fields set up by default. 
    // If not, we might get all schedules. Let's assume for now we might need to filter or the backend supports it.
    // Actually, standard ModelViewSet doesn't filter by default without django-filter.
    // Let's check backend views.py later. For now, we'll send the param.
  });
  // If backend doesn't filter, we filter here just in case
  return data.filter((ws: WorkSchedule) => ws.professional === Number(professionalId));
}

export async function updateWorkSchedule(id: number, payload: Partial<WorkSchedule>): Promise<WorkSchedule> {
  const { data } = await http.patch(`/agenda/work-schedules/${id}/`, payload);
  return data;
}

export async function createWorkSchedule(payload: Omit<WorkSchedule, "id">): Promise<WorkSchedule> {
  const { data } = await http.post("/agenda/work-schedules/", payload);
  return data;
}

export async function generateSlots(professionalId: number, date: string): Promise<any> {
  const { data } = await http.post("/agenda/slots/generate/", {
    professional_id: professionalId,
    date: date
  });
  return data;
}

// ---------------------------
// BREAKS (Colaciones/Descansos)
// ---------------------------
export interface Break {
  id?: number;
  work_schedule: number;
  start_time: string; // "HH:MM:SS"
  end_time: string;   // "HH:MM:SS"
}

export async function listBreaks(workScheduleId: number): Promise<Break[]> {
  const { data } = await http.get("/agenda/breaks/", {
    params: { work_schedule: workScheduleId }
  });
  return data;
}

export async function createBreak(payload: Break): Promise<Break> {
  const { data } = await http.post("/agenda/breaks/", payload);
  return data;
}

export async function deleteBreak(id: number): Promise<void> {
  await http.delete(`/agenda/breaks/${id}/`);
}