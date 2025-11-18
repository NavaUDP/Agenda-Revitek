import http from "./http";

// --- INICIO DE MODIFICACIONES ---

// 1. Definimos un tipo para el payload de creación/actualización
//    (Basado en tu implementación en AdminServicesPage.tsx)
export interface ServicioPayload {
  nombre: string;
  categoria?: string;
  duracion_min: number;
  activo?: boolean;
  precio: number;
}

// 2. Ajustamos createServicio para que use el tipo
export async function createServicio(payload: ServicioPayload) {
  const { data } = await http.post("/api/catalogo/servicios/", payload);
  return data;
}

// 3. AÑADIMOS la función de Actualizar (PATCH)
export async function updateServicio(id: number, payload: Partial<ServicioPayload>) {
  // Usamos PATCH para actualizaciones parciales (solo enviamos los campos que cambian)
  const { data } = await http.patch(`/api/catalogo/servicios/${id}/`, payload);
  return data;
}

// 4. AÑADIMOS la función de Eliminar (DELETE)
export async function deleteServicio(id: number) {
  await http.delete(`/api/catalogo/servicios/${id}/`);
}

// --- FIN DE MODIFICACIONES ---


// GET servicios disponibles para un profesional
export async function listServicios(profesionalId: number) {
  const { data } = await http.get("/api/servicios/", { params: { profesional_id: profesionalId } });
  // data: [{servicio:{id,nombre,categoria,duracion_min,activo}, duracion_eff, activo}]
  return data;
}

// POST asignar servicio a profesional
export async function asignarServicio(payload: {profesional:number; servicio:number; duracion_override_min?:number|null; activo?:boolean}) {
  const { data } = await http.post("/api/catalogo/servicio_asignaciones/", payload);
  return data;
}

// DELETE quitar asignación
export async function quitarServicio(asignacionId: number) {
  const { data } = await http.delete(`/api/catalogo/servicio_asignaciones/${asignacionId}/`);
  return data;
}

// List all servicios (no profesional filter)
export async function listAllServicios() {
  const { data } = await http.get('/api/catalogo/servicios/');
  return data;
}

// List ProfesionalServicio assignments filtered by servicio_id or profesional_id
export async function listAsignaciones(params: { servicio_id?: number; profesional_id?: number } = {}) {
  const { data } = await http.get('/api/catalogo/servicio_asignaciones/', { params });
  return data;
}