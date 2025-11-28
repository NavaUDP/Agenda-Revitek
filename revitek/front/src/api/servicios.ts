// revitek/front/src/api/servicios.ts
import http from "./http";

/* ============================================================
   TIPOS
============================================================ */

export interface ServicioPayload {
  name: string;
  category?: string;
  duration_min: number;
  active?: boolean;
  price: number;
}

/* ============================================================
   CRUD Servicios
============================================================ */

export interface Category {
  id: number;
  name: string;
}

export async function listAllServicios(params?: { include_inactive?: boolean }) {
  const { data } = await http.get("/catalog/services/", { params });
  return data;
}

export async function listCategories() {
  const { data } = await http.get("/catalog/categories/");
  return data;
}

export async function createServicio(payload: ServicioPayload) {
  const { data } = await http.post("/catalog/services/", payload);
  return data;
}

export async function updateServicio(id: number, payload: Partial<ServicioPayload>, params?: { include_inactive?: boolean }) {
  const { data } = await http.patch(`/catalog/services/${id}/`, payload, { params });
  return data;
}

export async function deleteServicio(id: number, params?: { include_inactive?: boolean }) {
  await http.delete(`/catalog/services/${id}/`, { params });
}

/* ============================================================
   ASIGNACIONES Profesional ↔ Servicio
============================================================ */

// Listar asignaciones para un profesional
export async function listAsignaciones(params: {
  professional_id?: number;
  service_id?: number;
} = {}) {
  const { data } = await http.get("/agenda/professional-services/", {
    params,
  });
  return data;
}

// Crear asignación
export async function asignarServicio(payload: {
  professional: number;
  service: number;
  duration_override_min?: number | null;
  active?: boolean;
}) {
  const { data } = await http.post("/agenda/professional-services/", payload);
  return data;
}

// Eliminar asignación
export async function quitarServicio(asignacionId: number) {
  await http.delete(`/agenda/professional-services/${asignacionId}/`);
}