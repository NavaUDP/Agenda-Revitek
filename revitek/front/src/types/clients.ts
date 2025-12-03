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

export interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    is_active: boolean;
    is_staff: boolean;
}

export interface UserPayload {
    email: string;
    first_name: string;
    last_name?: string;
    phone: string;
    password?: string;
}

export interface Address {
    id: number;
    alias: string;
    street: string;
    number: string;
    commune: Commune;
    region?: Region; // Sometimes flattened in response
    complement?: string;
    notes?: string;
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

export interface Vehicle {
    id: number;
    license_plate: string;
    brand: string;
    model: string;
    year?: number;
}

export interface VehiclePayload {
    license_plate: string;
    brand: string;
    model: string;
    year?: number;
}

export interface LookupResult {
    found: boolean;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    vehicle?: {
        id: number;
        brand: string;
        model: string;
        license_plate: string;
    };
    address?: {
        id: number;
        commune: string; // Name
        street: string;
        number: string;
        alias: string;
    };
}
