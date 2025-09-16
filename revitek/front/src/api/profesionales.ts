import http from "./http";

export async function listProfesionales() {
  const { data } = await http.get("/api/profesionales/");
  return data as Array<{ id:number; nombre:string }>;
}
