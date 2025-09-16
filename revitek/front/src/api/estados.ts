import http from "./http";
export async function getEstadoReserva(id: number) {
  const { data } = await http.get(`/api/estados/${id}`);
  return data;
}
