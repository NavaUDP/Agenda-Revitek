// ===== profesionales.ts =====
// src/api/profesionales.ts
import http from "./http";

export interface Professional {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  active?: boolean;
  accepts_reservations?: boolean;
  calendar_color?: string;
  bio?: string;
}

export async function listProfesionales(): Promise<Professional[]> {
  const { data } = await http.get("/agenda/professionals/");
  return data;
}

export async function createProfesional(payload: {
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  calendar_color?: string;
  bio?: string;
}): Promise<Professional> {
  const { data } = await http.post("/agenda/professionals/", payload);
  return data;
}

export async function deleteProfesional(id: number): Promise<void> {
  await http.delete(`/agenda/professionals/${id}/`);
}

export async function updateProfesional(
  id: number,
  payload: Partial<Professional>
): Promise<Professional> {
  const { data } = await http.put(`/agenda/professionals/${id}/`, payload);
  return data;
}

export async function getProfesional(id: number): Promise<Professional> {
  const { data } = await http.get(`/agenda/professionals/${id}/`);
  return data;
}