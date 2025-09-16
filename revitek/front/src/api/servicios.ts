import http from "./http";

// GET servicios disponibles para un profesional
export async function listServicios(profesionalId: number) {
  const { data } = await http.get("/api/servicios/", { params: { profesional_id: profesionalId } });
  // data: [{servicio:{id,nombre,categoria,duracion_min,activo}, duracion_eff, activo}]
  return data;
}

// POST crear servicio
export async function createServicio(payload: {nombre:string; categoria?:string; duracion_min:number; activo?:boolean}) {
  const { data } = await http.post("/api/servicios/all", payload);
  return data;
}

// POST asignar servicio a profesional
export async function asignarServicio(payload: {profesional_id:number; servicio_id:number; duracion_override_min?:number|null; activo?:boolean}) {
  const { data } = await http.post("/api/servicios/asignar", payload);
  return data;
}

// DELETE quitar asignación
export async function quitarServicio(profesionalId:number, servicioId:number) {
  const { data } = await http.delete(`/api/servicios/asignar`, { params: { profesional_id: profesionalId, servicio_id: servicioId }});
  return data;
}
