// revitek/front/src/api/profesionales.ts
import http from "./http";

export interface Profesional {
  id: number;
  nombre: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
  color_calendario?: string;
}

export async function listProfesionales(): Promise<Profesional[]> {
  const { data } = await http.get("/api/profesionales/profesionales/"); // Ajusta la ruta si es necesario
  return data;
}

export async function createProfesional(payload: { nombre: string; email?: string; telefono?: string }): Promise<Profesional> {
  const { data } = await http.post("/api/profesionales/profesionales/", payload);
  return data;
}

export async function deleteProfesional(id: number): Promise<void> {
  await http.delete(`/api/profesionales/profesionales/${id}/`);
}

// Puedes añadir getProfesional(id), updateProfesional(id, payload) si los necesitas