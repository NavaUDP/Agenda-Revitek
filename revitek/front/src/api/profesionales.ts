// src/api/profesionales.ts
import http from "./http";
import {
  Professional,
  ProfessionalPayload,
  ProfessionalUserPayload,
  PasswordUpdatePayload
} from "@/types/professionals";

export async function listProfessionals(): Promise<Professional[]> {
  const { data } = await http.get("/agenda/professionals/");
  return data;
}

export async function createProfessional(payload: ProfessionalPayload): Promise<Professional> {
  const { data } = await http.post("/agenda/professionals/", payload);
  return data;
}

export async function deleteProfessional(id: number): Promise<void> {
  await http.delete(`/agenda/professionals/${id}/`);
}

export async function updateProfessional(
  id: number,
  payload: Partial<ProfessionalPayload>
): Promise<Professional> {
  const { data } = await http.put(`/agenda/professionals/${id}/`, payload);
  return data;
}

export async function getProfessional(id: number): Promise<Professional> {
  const { data } = await http.get(`/agenda/professionals/${id}/`);
  return data;
}

export async function createProfessionalUser(
  id: number,
  payload: ProfessionalUserPayload
): Promise<void> {
  await http.post(`/agenda/professionals/${id}/create_user/`, payload);
}

export async function updateProfessionalPassword(
  id: number,
  payload: PasswordUpdatePayload
): Promise<void> {
  await http.post(`/agenda/professionals/${id}/update_password/`, payload);
}