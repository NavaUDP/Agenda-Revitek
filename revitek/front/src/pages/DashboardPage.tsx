import { useEffect, useState } from 'react';
import { getDashboardStats, DashboardStats } from '@/api/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, CheckCircle, XCircle, Clock, User, Car, PlayCircle, AlertCircle, Activity } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
    const [data, setData] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const load = async () => {
            try {
                const stats = await getDashboardStats();
                setData(stats);
            } catch (error) {
                console.error("Error loading dashboard:", error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return { label: 'Confirmada', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-100 border-emerald-200' };
            case 'PENDING': return { label: 'Pendiente', icon: Clock, color: 'text-amber-600 bg-amber-100 border-amber-200' };
            case 'CANCELLED': return { label: 'Cancelada', icon: XCircle, color: 'text-rose-600 bg-rose-100 border-rose-200' };
            case 'COMPLETED': return { label: 'Completada', icon: CheckCircle, color: 'text-blue-600 bg-blue-100 border-blue-200' };
            case 'IN_PROGRESS': return { label: 'En curso', icon: PlayCircle, color: 'text-purple-600 bg-purple-100 border-purple-200' };
            case 'RECONFIRMED': return { label: 'Reconfirmada', icon: CheckCircle, color: 'text-emerald-700 bg-emerald-100 border-emerald-200' };
            case 'WAITING_CLIENT': return { label: 'Esperando Cliente', icon: User, color: 'text-indigo-600 bg-indigo-100 border-indigo-200' };
            default: return { label: status, icon: AlertCircle, color: 'text-slate-600 bg-slate-100 border-slate-200' };
        }
    };

    const formatActivityDate = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return `hoy ${format(date, 'HH:mm')}`;
        if (isYesterday(date)) return `ayer ${format(date, 'HH:mm')}`;
        return format(date, "d 'de' MMMM, HH:mm", { locale: es });
    };

    const translateNote = (note: string) => {
        if (!note) return "";
        if (note.includes("Reservation created (Pending Confirmation)")) {
            return "Reserva creada (Pendiente de confirmación)";
        }
        if (note.includes("Re-confirmed by client via WhatsApp link")) {
            return note.replace("Re-confirmed by client via WhatsApp link", "Reconfirmada por cliente vía WhatsApp")
                .replace("previous status", "estado anterior");
        }
        if (note.includes("Completed by")) {
            return note.replace("Completed by", "Completada por").replace("Note:", "Nota:");
        }
        return note;
    };

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (!data) return <div className="p-8">Error al cargar el dashboard.</div>;

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bienvenido</h1>
                    <p className="text-muted-foreground">Resumen de tu actividad hoy.</p>
                </div>
                <Button onClick={() => navigate('/admin/agenda')}>Ver Agenda Completa</Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Citas esta Semana</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.week_total}</div>
                        <p className="text-xs text-muted-foreground">Total programadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completadas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.week_completed}</div>
                        <p className="text-xs text-muted-foreground">Esta semana</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
                        <XCircle className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.week_cancelled}</div>
                        <p className="text-xs text-muted-foreground">Esta semana</p>
                    </CardContent>
                </Card>
            </div>

            {/* Weekly Activity Chart - Admin Only */}
            {user?.is_staff && data.weekly_activity && (
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Actividad Semanal
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full relative">
                            {!data.weekly_activity.some(d => d.citas > 0) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px] z-10">
                                    <p className="text-muted-foreground font-medium">No hay actividad registrada esta semana.</p>
                                </div>
                            )}
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.weekly_activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted)/0.2)', radius: 4 }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const dayNames: Record<string, string> = {
                                                    'Lun': 'Lunes', 'Mar': 'Martes', 'Mié': 'Miércoles',
                                                    'Jue': 'Jueves', 'Vie': 'Viernes', 'Sáb': 'Sábado', 'Dom': 'Domingo'
                                                };
                                                const fullDay = dayNames[label] || label;
                                                return (
                                                    <div className="rounded-lg border bg-popover p-2 shadow-md">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-semibold text-popover-foreground">
                                                                {fullDay}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                                                <span className="text-sm text-muted-foreground">
                                                                    {payload[0].value} citas
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar
                                        dataKey="citas"
                                        fill="hsl(var(--primary))"
                                        radius={[4, 4, 0, 0]}
                                        barSize={40}
                                        className="fill-primary hover:fill-primary/90 transition-colors"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Next Appointment */}
                    <Card className="border-l-4 border-l-primary shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Clock className="mr-2 h-5 w-5 text-primary" /> Próxima Cita
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data.next_appointment ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-semibold">
                                                {format(new Date(data.next_appointment.slots_summary?.start || ''), 'EEEE d MMMM, HH:mm', { locale: es })}
                                            </h3>
                                            <div className="flex items-center text-muted-foreground mt-1">
                                                <User className="mr-1 h-4 w-4" />
                                                {data.next_appointment.client_info?.first_name} {data.next_appointment.client_info?.last_name}
                                            </div>
                                            {data.next_appointment.vehicle_info && (
                                                <div className="flex items-center text-muted-foreground mt-1">
                                                    <Car className="mr-1 h-4 w-4" />
                                                    {data.next_appointment.vehicle_info.brand} {data.next_appointment.vehicle_info.model} ({data.next_appointment.vehicle_info.license_plate})
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                                            {getStatusConfig(data.next_appointment.status).label}
                                        </div>
                                    </div>
                                    <div className="border-t pt-4">
                                        <p className="font-medium mb-2 text-sm">Servicios:</p>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                                            {data.next_appointment.services.map((s: any) => (
                                                <li key={s.id}>{s.service_name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No tienes próximas citas agendadas.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Today's List */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Agenda de Hoy</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data.today_appointments.length > 0 ? (
                                <div className="space-y-3">
                                    {data.today_appointments.map((appt) => {
                                        const statusConfig = getStatusConfig(appt.status);
                                        return (
                                            <div key={appt.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-transparent hover:border-border hover:bg-muted/50 transition-all">
                                                <div className="flex items-center space-x-4">
                                                    <div className="bg-background border border-border p-2 rounded-md font-bold text-center min-w-[60px] shadow-sm">
                                                        {format(new Date(appt.slots_summary?.start || ''), 'HH:mm')}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{appt.client_info?.first_name} {appt.client_info?.last_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {appt.services.length} servicio(s)
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium border", statusConfig.color)}>
                                                    {statusConfig.label}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No hay citas para hoy.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity Feed */}
                <div className="lg:col-span-1">
                    <Card className="h-full shadow-sm flex flex-col">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Activity className="h-5 w-5 text-primary" /> Actividad Reciente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto max-h-[600px] pr-2">
                            <div className="relative pl-4 border-l border-border space-y-8">
                                {data.recent_activity && data.recent_activity.length > 0 ? (
                                    data.recent_activity.map((activity) => {
                                        const config = getStatusConfig(activity.status);
                                        const Icon = config.icon;
                                        return (
                                            <div key={activity.id} className="relative group">
                                                {/* Timeline dot */}
                                                <div className={cn(
                                                    "absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-background ring-2 ring-offset-0 transition-all",
                                                    config.color.split(' ')[0].replace('text-', 'bg-') // Use the text color as bg for the dot
                                                )} />

                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border w-fit", config.color)}>
                                                            {config.label}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground tabular-nums">
                                                            {formatActivityDate(activity.timestamp)}
                                                        </span>
                                                    </div>

                                                    <p className="text-sm font-medium text-foreground mt-1">
                                                        {activity.client_name}
                                                    </p>

                                                    {activity.note && (
                                                        <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded-md italic border border-border/50">
                                                            "{translateNote(activity.note)}"
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground ml-[-16px]">
                                        <p>No hay actividad reciente por ahora.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
            </div>
        </div>
    );
}
