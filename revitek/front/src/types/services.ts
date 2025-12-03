export interface ServicePayload {
    name: string;
    description?: string;
    category?: string;
    duration_min: number;
    active?: boolean;
    price: number;
}

export interface Service extends ServicePayload {
    id: number;
}

export interface Category {
    id: number;
    name: string;
}

export interface ProfessionalServiceAssignment {
    id: number;
    professional: number;
    service: number;
    duration_override_min?: number;
    active: boolean;
    service_details?: Service; // Assuming backend expands this or we need it
}

export interface AssignmentPayload {
    professional: number;
    service: number;
    duration_override_min?: number | null;
    active?: boolean;
}
