// src/api/clientes.ts
import api from "./http";

// ============================
// Tipos
// ============================
export interface Region {
    id: number;
    name: string;
    roman_number: string;
    number: number;
}

export interface Commune {
    id: number;
    name: string;
    region: Region;
}

export interface AddressPayload {
    alias?: string;
    street: string;
    number: string;
    complement?: string;
    commune_id: number;
    notes?: string;
    lat?: number | null;
    lon?: number | null;
}

export interface VehiclePayload {
    license_plate: string;
    brand: string;
    model: string;
    year?: number;
}

export interface UserPayload {
    email: string;
    first_name: string;
    last_name?: string;
    phone: string;
    password?: string;
}

// ============================
// REGIONES Y COMUNAS
// ============================
export async function listRegions(): Promise<Region[]> {
    const res = await api.get("/clients/regions/");
    return res.data;
}

export async function listCommunes(): Promise<Commune[]> {
    const res = await api.get("/clients/communes/");
    return res.data;
}

// ============================
// USERS
// ============================
export async function createUser(data: UserPayload) {
    const res = await api.post("/clients/users/", data);
    return res.data;
}

export async function getMyUser() {
    const res = await api.get("/clients/users/");
    return res.data[0]; // solo retorna uno si NO es admin
}

export async function lookupClient(params: { email?: string; phone?: string }) {
    const res = await api.get("/clients/users/lookup/", { params });
    return res.data;
}

// ============================
// ADDRESSES
// ============================
export async function listAddresses() {
    const res = await api.get("/clients/addresses/");
    return res.data;
}

export async function createAddress(data: AddressPayload) {
    const res = await api.post("/clients/addresses/", data);
    return res.data;
}

// ============================
// VEHICLES
// ============================
export async function listVehicles() {
    const res = await api.get("/clients/vehicles/");
    return res.data;
}

export async function createVehicle(data: VehiclePayload) {
    const res = await api.post("/clients/vehicles/", data);
    return res.data;
}
