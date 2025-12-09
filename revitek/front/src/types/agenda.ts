export interface ReservationClient {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
}

export interface ReservationServiceItem {
    service_id: number;
    service_name: string;
    professional_id: number;
    effective_duration_min: number;
}

export interface ReservationSlotSummary {
    slot_id_start: number;
    slot_id_end: number;
    start: string;
    end: string;
    professional_id: number;
}

export interface ClientInfo {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
}

export interface Address {
    id: number;
    alias: string;
    street: string;
    number: string;
    commune: string;
    region: string;
    complement?: string;
    notes?: string;
}

export interface Vehicle {
    id: number;
    license_plate: string;
    brand: string;
    model: string;
    year?: number;
}

export interface ReservationDetailed {
    id: number;
    status: string;
    total_min: number;
    note: string;
    created_at: string;
    cancelled_by: string | null;
    services: ReservationServiceItem[];
    slots_summary: ReservationSlotSummary | null;
    client_info: ClientInfo | null;
    address: Address | null;
    vehicle: Vehicle | null;
    vehicle_info?: Vehicle | null; // Alias for vehicle, used in some responses
    client_addresses: Address[];
    client_vehicles: Vehicle[];
}

export interface Slot {
    id: number;
    professional: number;
    date: string;
    start: string;
    end: string;
    status: string;
}

export interface ReservationPayload {
    client: {
        first_name: string;
        last_name?: string;
        email: string;
        phone: string;
    };
    vehicle?: {
        license_plate: string;
        brand: string;
        model?: string;
        year?: number;
    };
    address?: {
        street: string;
        number: string;
        commune_id: number;
        alias?: string;
        notes?: string;
    };
    professional_id: number;
    services: { service_id: number; professional_id: number }[];
    slot_id: number;
    note?: string;
    recaptcha_token?: string;
}

export interface SlotBlockData {
    id?: number;
    professional: number;
    date: string;
    start: string;
    end: string;
    reason?: string;
    created_at?: string;
}

export interface WorkSchedule {
    id: number;
    professional: number;
    weekday: number; // 0=Monday, 6=Sunday
    start_time: string; // "HH:MM:SS"
    end_time: string;   // "HH:MM:SS"
    active: boolean;
}

export interface Break {
    id?: number;
    work_schedule: number;
    start_time: string; // "HH:MM:SS"
    end_time: string;   // "HH:MM:SS"
}
