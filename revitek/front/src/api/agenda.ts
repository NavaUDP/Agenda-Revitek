// src/api/agenda.ts
import http from "./http";
export type {
  ReservationPayload,
  ReservationDetailed,
  Slot,
  SlotBlockData,
  WorkSchedule,
  Break
} from "@/types/agenda";
import {
  ReservationPayload,
  ReservationDetailed,
  Slot,
  SlotBlockData,
  WorkSchedule,
  Break
} from "@/types/agenda";

// ---------------------------
// SLOTS
// ---------------------------
export async function listSlots(params: {
  professionalId?: number;
  date: string;
}): Promise<Slot[]> {
  const q: any = { date: params.date };
  if (params.professionalId) q.professional_id = params.professionalId;

  const { data } = await http.get("/agenda/slots/", { params: q });
  return data;
}

// ---------------------------
// RESERVATIONS
// ---------------------------
export async function createReservation(payload: ReservationPayload): Promise<ReservationDetailed> {
  const { data } = await http.post("/agenda/reservations/", payload);
  return data;
}

export async function getReservation(id: number): Promise<ReservationDetailed> {
  const { data } = await http.get(`/agenda/reservations/${id}/`);
  return data;
}

export async function listReservations(params?: {
  date?: string;
  status?: string;
  professional_id?: number;
  client_id?: number;
  include_cancelled?: boolean;
}): Promise<ReservationDetailed[]> {
  const { data } = await http.get("/agenda/reservations/", { params });
  return data;
}

export async function cancelReservation(id: number): Promise<void> {
  await http.post(`/agenda/reservations/${id}/cancel/`, {
    by: "admin",
  });
}

export async function updateReservationStatus(id: number, status: string): Promise<ReservationDetailed> {
  const { data } = await http.patch(`/agenda/reservations/${id}/`, { status });
  return data;
}

export async function confirmReservation(token: string): Promise<{ detail: string }> {
  const { data } = await http.get(`/agenda/confirm/${token}/`);
  return data;
}

// ---------------------------
// BLOCKS
// ---------------------------
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
  const { data } = await http.post("/agenda/blocks/", payload);
  return data;
}

export async function updateBlock(
  id: number,
  payload: Partial<SlotBlockData>
): Promise<SlotBlockData> {
  const { data } = await http.put(`/agenda/blocks/${id}/`, payload);
  return data;
}

export async function deleteBlock(id: number): Promise<void> {
  await http.delete(`/agenda/blocks/${id}/`);
}

// ---------------------------
// AGGREGATED AVAILABILITY
// ---------------------------
export async function getAggregatedAvailability(
  services: number[],
  date: string
): Promise<any> {
  const { data } = await http.post("/agenda/availability/", {
    services,
    date,
  });
  return data;
}

// ---------------------------
// WORK SCHEDULES
// ---------------------------
export async function listWorkSchedules(professionalId: number): Promise<WorkSchedule[]> {
  const { data } = await http.get("/agenda/work-schedules/", {
    params: { professional: professionalId }
  });
  // Backend now supports filtering by professional, so we return data directly.
  return data;
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
// BREAKS
// ---------------------------
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