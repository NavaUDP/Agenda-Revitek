// src/api/servicios.ts
import http from "./http";
import {
  Service,
  ServicePayload,
  Category,
  ProfessionalServiceAssignment,
  AssignmentPayload
} from "@/types/services";

/* ============================================================
   CRUD Services
============================================================ */

export async function listAllServices(params?: { include_inactive?: boolean }): Promise<Service[]> {
  const { data } = await http.get("/catalog/services/", { params });
  return data;
}

// Alias for backward compatibility or clarity if needed, but prefer listAllServices or listServices
export const listServices = listAllServices;

export async function listCategories(): Promise<Category[]> {
  const { data } = await http.get("/catalog/categories/");
  return data;
}

export async function createService(payload: ServicePayload): Promise<Service> {
  const { data } = await http.post("/catalog/services/", payload);
  return data;
}

export async function updateService(
  id: number,
  payload: Partial<ServicePayload>,
  params?: { include_inactive?: boolean }
): Promise<Service> {
  const { data } = await http.patch(`/catalog/services/${id}/`, payload, { params });
  return data;
}

export async function deleteService(id: number, params?: { include_inactive?: boolean }): Promise<void> {
  await http.delete(`/catalog/services/${id}/`, { params });
}

/* ============================================================
   ASSIGNMENTS Professional <-> Service
============================================================ */

export async function listProfessionalServices(params: {
  professional_id?: number;
  service_id?: number;
} = {}): Promise<ProfessionalServiceAssignment[]> {
  const { data } = await http.get("/agenda/professional-services/", {
    params,
  });
  return data;
}

export async function assignService(payload: AssignmentPayload): Promise<ProfessionalServiceAssignment> {
  const { data } = await http.post("/agenda/professional-services/", payload);
  return data;
}

export async function removeServiceAssignment(assignmentId: number): Promise<void> {
  await http.delete(`/agenda/professional-services/${assignmentId}/`);
}