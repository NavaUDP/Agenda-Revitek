import { useState, useEffect } from 'react';
import { listProfessionals } from '@/api/profesionales';
import { listReservations, ReservationDetailed } from "@/api/agenda";
import http from "@/api/http";
import { toast } from "sonner";

export type CalendarResource = {
    id: string;
    title: string;
    eventColor?: string;
    eventBackgroundColor?: string;
    eventBorderColor?: string;
};

export type CalendarEvent = {
    id: string;
    resourceId: string;
    title: string;
    start: string;
    end: string;
    backgroundColor?: string;
    borderColor?: string;
    display?: "background" | "auto" | "block";
    extendedProps: {
        type: "appointment" | "blocked";
        client?: string;
        reservaId?: number;
        blockId?: number;
        reason?: string;
        status?: string;
    };
};

function transformReservasToEvents(
    reservas: ReservationDetailed[],
    colorMap: Record<string, string>
): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    for (const reserva of reservas) {
        const slots = reserva.slots_summary;
        if (!slots) continue;

        const firstName = reserva.client_info?.first_name || "Cliente";
        const lastName = reserva.client_info?.last_name || "";
        const title = (firstName + " " + lastName).trim();

        const isCancelled = reserva.status === "CANCELLED";
        const isPending = reserva.status === "PENDING";
        const profId = String(slots.professional_id);
        const profColor = colorMap[profId] || "#3b82f6";

        let eventTitle = title;
        if (isCancelled) eventTitle = "(CANCELADA) " + title;
        else if (isPending) eventTitle = "⏳ " + title;

        events.push({
            id: String(reserva.id),
            resourceId: profId,
            title: eventTitle,
            start: slots.start,
            end: slots.end,
            backgroundColor: isCancelled ? "#6b7280" : (isPending ? profColor + "CC" : profColor),
            borderColor: isCancelled ? "#4b5563" : (isPending ? "#f59e0b" : profColor),
            extendedProps: {
                type: "appointment",
                client: title,
                reservaId: reserva.id,
                status: reserva.status,
            },
        });
    }

    return events;
}

async function loadBlockedSlots(): Promise<CalendarEvent[]> {
    try {
        const { data } = await http.get('/agenda/blocks/');
        return data.map((block: any) => ({
            id: "block_" + block.id,
            resourceId: String(block.professional),
            title: "🚫 " + (block.reason || 'Bloqueo'),
            start: block.start,
            end: block.end,
            backgroundColor: '#ef4444',
            borderColor: '#dc2626',
            display: 'block',
            extendedProps: {
                type: 'blocked',
                blockId: block.id,
                reason: block.reason
            }
        }));
    } catch (error) {
        console.error('Error loading blocked slots:', error);
        return [];
    }
}

export function useAdminCalendarData() {
    const [resources, setResources] = useState<CalendarResource[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const refreshData = () => {
        setLoading(true);
        Promise.all([
            listProfessionals(),
            listReservations(),
            loadBlockedSlots(),
        ])
            .then(([profData, reservasData, blockedData]) => {
                const colorMap: Record<string, string> = {};
                profData.forEach((p: any) => {
                    colorMap[String(p.id)] = p.calendar_color || "#3b82f6";
                });

                setResources(
                    profData.map((p: any) => ({
                        id: String(p.id),
                        title: (p.first_name + " " + p.last_name).trim(),
                        eventColor: p.calendar_color || '#3b82f6',
                        eventBackgroundColor: p.calendar_color || '#3b82f6',
                        eventBorderColor: p.calendar_color || '#3b82f6',
                    }))
                );

                const reservationEvents = transformReservasToEvents(reservasData, colorMap);
                const allEvents = [...reservationEvents, ...blockedData];
                setEvents(allEvents);
            })
            .catch((error) => {
                console.error("Error fetching admin data:", error);
                toast.error("Error de Carga: No se pudieron cargar los datos del calendario.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        refreshData();
    }, []);

    return { resources, events, loading, refreshData, setResources, setEvents };
}
