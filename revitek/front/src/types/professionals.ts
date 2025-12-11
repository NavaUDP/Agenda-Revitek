export interface Professional {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    active?: boolean;
    accepts_reservations?: boolean;
    calendar_color?: string;
    bio?: string;
    has_user?: boolean;
    user_email?: string;
}

export interface ProfessionalPayload {
    first_name: string;
    last_name?: string;
    email?: string;
    phone?: string;
    password?: string;
    create_user_account?: boolean;
    calendar_color?: string;
    bio?: string;
    active?: boolean;
    accepts_reservations?: boolean;
}

export interface ProfessionalUserPayload {
    email: string;
    password: string;
}

export interface PasswordUpdatePayload {
    password: string;
}
