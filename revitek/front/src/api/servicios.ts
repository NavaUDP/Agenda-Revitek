import http from "./http";

export async function listServicios(profesionalId: number) {
  const { data } = await http.get("/api/servicios/", { params: { profesional_id: profesionalId } });
  // data: [{servicio:{id,nombre,...}, duracion_eff, precio_eff}]
  return data;
}
