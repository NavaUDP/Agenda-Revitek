// src/api/clientes.ts
import api from "./http";
import {
    Region,
    Commune,
    User,
    UserPayload,
    Address,
    AddressPayload,
    Vehicle,
    VehiclePayload,
    LookupResult
} from "@/types/clients";

// ============================
// REGIONES Y COMUNAS
// ============================
export async function listRegions(): Promise<Region[]> {
    const res = await api.get("/clients/regions/", { skipAuth: true });
    return res.data;
}

export async function listCommunes(): Promise<Commune[]> {
    const res = await api.get("/clients/communes/", { skipAuth: true });
    return res.data;
}

// ============================
// USERS
// ============================
export async function createUser(data: UserPayload): Promise<User> {
    const res = await api.post("/clients/users/", data);
    return res.data;
}

export async function getMyUser(): Promise<User> {
    const res = await api.get("/clients/users/");
    // If the endpoint returns a list (standard ViewSet list), we take the first one?
    // Or is this a custom endpoint?
    // Based on original code: return res.data[0];
    // This implies the endpoint returns a list of users (filtered by self?).
    // Ideally this should be /clients/users/me/ or similar.
    // Keeping original logic but typing it.
    return res.data[0];
}

export async function lookupClient(params: { email?: string; phone?: string }): Promise<LookupResult> {
    const res = await api.get("/clients/users/lookup/", { params, skipAuth: true });
    return res.data;
}

// ============================
// ADDRESSES
// ============================
export async function listAddresses(): Promise<Address[]> {
    const res = await api.get("/clients/addresses/");
    return res.data;
}

export async function createAddress(data: AddressPayload): Promise<Address> {
    const res = await api.post("/clients/addresses/", data);
    return res.data;
}

// ============================
// VEHICLES
// ============================
export async function listVehicles(): Promise<Vehicle[]> {
    const res = await api.get("/clients/vehicles/");
    return res.data;
}

export async function createVehicle(data: VehiclePayload): Promise<Vehicle> {
    const res = await api.post("/clients/vehicles/", data);
    return res.data;
}
