import http from './http';
import { ReservationDetailed } from './agenda';

export interface DashboardStats {
    today_appointments: ReservationDetailed[];
    next_appointment: ReservationDetailed | null;
    stats: {
        week_total: number;
        week_cancelled: number;
        week_completed: number;
    };
    recent_activity: {
        id: number;
        reservation: number;
        status: string;
        timestamp: string;
        note: string;
        client_name: string;
    }[];
    weekly_activity: {
        day: string;
        citas: number;
    }[];
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const { data } = await http.get('/agenda/dashboard/');
    return data;
};
