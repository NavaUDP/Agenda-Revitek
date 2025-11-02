import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { listAllServicios } from '@/api/servicios';
// --- (MODIFICACIÓN 1: Importar ReservaPayload) ---
import { getAggregatedAvailability, createReserva, ReservaPayload } from '@/api/agenda'; 
import { useEffect, useState } from 'react';

function ServiceBooking({ selectedServiceIdsProp, onClose }: { selectedServiceIdsProp?: number[]; onClose?: () => void }) {
    const [params] = useSearchParams();
    const serviceId = params.get('service_id');
    const servicesParam = params.get('services');
    const selectedServiceIds = selectedServiceIdsProp ?? (servicesParam ? servicesParam.split(',').map(x => Number(x)).filter(Boolean) : (serviceId ? [Number(serviceId)] : []));

    const [aggregatedSlots, setAggregatedSlots] = useState<any[]>([]);
    // date selector for availability (YYYY-MM-DD)
    const todayIso = new Date().toISOString().slice(0, 10);
    const [selectedDate, setSelectedDate] = useState<string>(todayIso);

    useEffect(() => {
        // fetch aggregated availability from server: only slots where a professional can do ALL selected services
        let cancelled = false;
        async function load() {
            if (!selectedServiceIds || selectedServiceIds.length === 0) {
                setAggregatedSlots([]);
                return;
            }
            try {
                const data = await getAggregatedAvailability(selectedServiceIds, selectedDate);
                if (cancelled) return;
                // normalise server response: slot_ids -> slotIds, profes -> profes
                const norm = (data || []).map((d: any) => ({
                    inicio: d.inicio,
                    fin: d.fin,
                    profes: d.profes || d.profesionales || [],
                    slotIds: d.slot_ids || d.slotIds || []
                }));
                setAggregatedSlots(norm);
            } catch (e) {
                console.error('aggregated availability error', e);
                setAggregatedSlots([]);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [JSON.stringify(selectedServiceIds), selectedDate]);

    // Helper: small month calendar component (inline)
    function MonthCalendar({ selectedDate, onSelectDate }: { selectedDate: string; onSelectDate: (iso: string) => void }) {
        const [monthOffset, setMonthOffset] = useState(0);
        const base = new Date();
        const display = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
        const year = display.getFullYear();
        const month = display.getMonth();
        const firstDayWeekday = new Date(year, month, 1).getDay(); // 0..6 (Sun..Sat)
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const prevMonth = () => setMonthOffset((m) => m - 1);
        const nextMonth = () => setMonthOffset((m) => m + 1);

        const buildCells = () => {
            const cells: { iso: string; label: number; inMonth: boolean }[] = [];
            // days from prev month
            const prevDays = firstDayWeekday; // number of leading blanks (start at Sunday)
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            for (let i = prevDays - 1; i >= 0; i--) {
                const d = new Date(year, month - 1, prevMonthLastDay - i);
                cells.push({ iso: d.toISOString().slice(0, 10), label: d.getDate(), inMonth: false });
            }
            // current month days
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, month, d);
                cells.push({ iso: date.toISOString().slice(0, 10), label: d, inMonth: true });
            }
            // trailing next month days to fill weeks to 7
            while (cells.length % 7 !== 0) {
                const d = new Date(year, month + 1, cells.length - prevDays - daysInMonth + 1);
                cells.push({ iso: d.toISOString().slice(0, 10), label: d.getDate(), inMonth: false });
            }
            return cells;
        };

        const cells = buildCells();

        return (
            <div>
                <div className="flex items-center justify-between mb-2">
                    <button onClick={prevMonth} className="px-2 py-1 rounded hover:bg-muted/30">◀</button>
                    <div className="font-semibold">{display.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
                    <button onClick={nextMonth} className="px-2 py-1 rounded hover:bg-muted/30">▶</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => (
                        <div key={w} className="py-1">{w}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 mt-2">
                    {cells.map((c) => (
                        <button key={c.iso} onClick={() => onSelectDate(c.iso)} className={`p-2 rounded ${c.inMonth ? '' : 'text-muted-foreground'} ${selectedDate === c.iso ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/20'}`}>
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    async function reservarAggregated(aggr: { inicio: string; fin: string; profes: number[]; slotIds?: number[]; slot_ids?: number[] }) {
        if (!aggr || selectedServiceIds.length === 0) return;
        
        const profesional_id = aggr.profes[0];
        const slot_id = Array.isArray(aggr.slotIds) && aggr.slotIds.length ? aggr.slotIds[0] : (Array.isArray((aggr as any).slot_ids) ? (aggr as any).slot_ids[0] : undefined);
        
        // Validar que tengamos un slot_id
        if (!slot_id) {
             alert('Error: No se pudo encontrar un ID de slot para esta reserva.');
             console.error("Error: slot_id es undefined", aggr);
             return;
        }

        const serviciosPayload = selectedServiceIds.map(sid => ({ servicio_id: Number(sid), profesional_id }));

        // --- (MODIFICACIÓN 2: Corregir el payload) ---

        // 1. Generamos un email temporal único para cumplir la validación del backend
        const tempEmail = `cliente_${Date.now()}@revitek.cl`;

        // 2. Definimos el payload CORRECTO según ReservaCreateSerializer
        const payload: ReservaPayload = {
            cliente: { 
                nombre: 'Cliente Web', 
                email: tempEmail, // Usamos el email temporal (no puede ser null)
                telefono: '0'     // Usamos un placeholder
            },
            // Se eliminan los campos 'titular_nombre', 'titular_email', 'titular_tel'
            profesional_id: profesional_id,
            servicios: serviciosPayload,
            slot_id: slot_id,
            nota: 'Reservado desde frontend (multi-service)'
        };
        // --- (FIN DE LA MODIFICACIÓN) ---

        try {
            const res = await createReserva(payload); // Ahora 'payload' es correcto
            alert('Reserva creada: ' + res.id);
            if (onClose) onClose();
        } catch (e: any) {
            console.error(e);
            const errorMsg = e?.response?.data ? JSON.stringify(e.response.data) : (e.message || 'unknown');
            alert('Error al crear reserva: ' + errorMsg);
        }
    }

    if (selectedServiceIds.length === 0) return (<div className="p-8 text-muted-foreground">Selecciona un servicio desde la página de servicios.</div>);

    return (
        <div className="p-4 bg-card rounded border border-border">
        

            <div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div className="col-span-1">
                            <div className="p-4 bg-background rounded border border-border">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium">Seleccionar fecha</h4>
                                    {onClose && <Button variant="ghost" onClick={onClose}>Cerrar</Button>}
                                </div>
                                <div className="space-y-3">
                                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full rounded-md px-3 py-2 border border-border bg-input" />

                                    <div>
                                        {/* Month calendar */}
                                        <MonthCalendar selectedDate={selectedDate} onSelectDate={(iso) => setSelectedDate(iso)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <div className="p-4 bg-background rounded border border-border">
                                <h4 className="font-medium">Horarios disponibles ({new Date(selectedDate).toLocaleDateString()})</h4>
                                {aggregatedSlots.length === 0 && <div className="text-muted-foreground mt-3">No hay slots disponibles para esta fecha</div>}
                                <div className="mt-3 max-h-[440px] overflow-y-auto">
                                    {/* Group slots by period */}
                                    {(() => {
                                        const groups: Record<string, any[]> = { 'Mañana': [], 'Tarde': [], 'Noche': [] };
                                        aggregatedSlots.forEach((s) => {
                                            const hour = new Date(s.inicio).getHours();
                                            if (hour < 12) groups['Mañana'].push(s);
                                            else if (hour < 18) groups['Tarde'].push(s);
                                            else groups['Noche'].push(s);
                                        });

                                        return Object.entries(groups).map(([label, items]) => (
                                            <div key={label} className="mb-4">
                                                <div className="sticky top-0 bg-background/90 py-1 font-semibold border-b">{label}</div>
                                                <div className="space-y-2 mt-2">
                                                    {items.length === 0 && <div className="text-muted-foreground p-2">No hay horarios en esta franja</div>}
                                                    {items.map((s: any, idx: number) => {
                                                        const timeLabel = new Date(s.inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                        return (
                                                            <div key={idx} className="flex items-center justify-between p-3 border rounded bg-card">
                                                                <div>
                                                                    <div className="font-semibold">{timeLabel}</div>
                                                                    <div className="text-sm text-muted-foreground">{s.profes.length} profesional(es) disponibles</div>
                                                                </div>
                                                                <div>
                                                                    <Button onClick={() => reservarAggregated(s)}>Reservar</Button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
            </div>
        </div>
    );
}

function ServicesArea() {
    const [params] = useSearchParams();
    const serviceId = params.get('service_id');
    const [services, setServices] = useState<any[]>([]);
    const navigate = useNavigate();

    const [groups, setGroups] = useState<Record<string, any[]>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [selectedServices, setSelectedServices] = useState<number[]>([]);
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [activeBookingServices, setActiveBookingServices] = useState<number[] | null>(null);

    useEffect(() => {
        listAllServicios()
            .then((data) => {
                setServices(data || []);
                const g: Record<string, any[]> = {};
                (data || []).forEach((s: any) => {
                    const cat = s.categoria && s.categoria.trim() ? s.categoria.trim().toUpperCase() : 'OTROS';
                    if (!g[cat]) g[cat] = [];
                    g[cat].push(s);
                });
                setGroups(g);
                const first = Object.keys(g)[0];
                const e: Record<string, boolean> = {};
                Object.keys(g).forEach((k) => { e[k] = k === first; });
                setExpanded(e);
            })
            .catch(() => {
                setServices([]);
                setGroups({});
            });
    }, []);

    if (serviceId) {
        return <ServiceBooking />;
    }

    const toggleCategory = (cat: string) => {
        setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
    };

    const toggleSelectService = (id: number) => {
        setSelectedServices((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div>
            {selectedServices.length > 0 && (
                <div className="mb-4 p-3 bg-card rounded border border-border flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        {selectedServices.map((sid) => {
                            const svc = services.find(s => s.id === sid);
                            return (
                                <div key={sid} className="px-3 py-1 bg-primary/5 text-sm rounded-full">{svc?.nombre || sid}</div>
                            );
                        })}
                    </div>
                    <div>
                        <Button onClick={() => { setActiveBookingServices([...selectedServices]); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Continuar a reserva</Button>
                    </div>
                </div>
            )}

            {(() => {
                // Desired order: SERVICIO REVISION TÉCNICA, Grabado patente, Lavados, Servicio de traslado, OTROS
                const desiredOrder = [
                    'SERVICIO REVISION TÉCNICA',
                    'GRABADO PATENTE',
                    'LAVADOS',
                    'SERVICIO DE TRASLADO',
                    'OTROS',
                ];
                const cats = Object.keys(groups || {});
                cats.sort((a, b) => {
                    const ia = desiredOrder.indexOf(a);
                    const ib = desiredOrder.indexOf(b);
                    if (ia === -1 && ib === -1) return a.localeCompare(b);
                    if (ia === -1) return 1;
                    if (ib === -1) return -1;
                    return ia - ib;
                });
                return cats.map((cat) => (
                <div key={cat} className="mb-4">
                    <div onClick={() => toggleCategory(cat)} role="button" tabIndex={0} className="flex items-center justify-between bg-muted/40 px-4 py-3 rounded-md border border-border cursor-pointer" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCategory(cat); }}>
                        <div className="font-semibold text-sm text-foreground">{cat}</div>
                        <div className="text-muted-foreground" aria-hidden>
                            {expanded[cat] ? '▾' : '▸'}
                        </div>
                    </div>

                    {expanded[cat] && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groups[cat].map((s: any) => (
                                <div key={s.id} className="relative p-4 border-2 rounded-md bg-card border-emerald-300">
                                    <div className="absolute top-3 right-3">
                                        <button onClick={() => setOpenDropdown(openDropdown === s.id ? null : s.id)} className="text-muted-foreground">⋯</button>
                                    </div>

                                    <div className="flex flex-col h-full">
                                        <div className="mb-3">
                                            <div className="font-semibold text-lg text-foreground">{s.nombre}</div>
                                            <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-2">
                                                <div>{Math.round((s.duracion_min || 60) / 60)} hrs</div>
                                                <div>|</div>
                                                <div>En domicilio</div>
                                            </div>
                                            {/* Hide price for OTROS category when price is zero */}
                                            {!(cat === 'OTROS' && ((s.precio || 0) === 0)) && (
                                                <div className="mt-3 font-semibold text-foreground">${s.precio?.toLocaleString?.() ?? s.precio}</div>
                                            )}
                                        </div>

                                        <div className="mt-auto flex justify-end">
                                            <Button onClick={() => { setActiveBookingServices([s.id]); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="bg-emerald-500">Agendar servicio</Button>
                                        </div>
                                    </div>

                                    {openDropdown === s.id && (
                                        <div className="absolute left-4 right-4 bottom-4 bg-card border rounded-md p-3 shadow-md">
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center space-x-2">
                                                    <input type="checkbox" checked={selectedServices.includes(s.id)} onChange={() => toggleSelectService(s.id)} />
                                                    <span className="text-sm">Seleccionar este servicio</span>
                                                </label>
                                                <div>
                                                    <Button onClick={() => { toggleSelectService(s.id); setOpenDropdown(null); }} variant="outline">Agregar</Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ));
                })()}

            {activeBookingServices && (
                <div className="mt-6">
                    <ServiceBooking selectedServiceIdsProp={activeBookingServices} onClose={() => setActiveBookingServices(null)} />
                </div>
            )}
        </div>
    );
}

function ClientBookingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="p-4 border-b border-border flex justify-between items-center">
                <h1 className="text-2xl font-bold text-primary">Agenda tu Servicio</h1>
                <Button asChild variant="outline">
                    <Link to="/login">Login</Link>
                </Button>
            </header>

            <main className="p-8">
                <h2 className="text-xl font-semibold mb-6">Agendar servicio</h2>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <aside className="col-span-1">
                        <div className="mb-4">
                            <input placeholder="¿Qué servicio buscas?" className="w-full rounded-md px-3 py-2 border border-border bg-input" />
                        </div>
                        <div className="space-y-2 bg-card p-3 rounded border border-border">
                            <button className="w-full text-left px-3 py-2 rounded bg-primary/5">Todos</button>
                            <button className="w-full text-left px-3 py-2 rounded hover:bg-accent/5">SERVICIO REVISIÓN TÉCNICA</button>
                            <button className="w-full text-left px-3 py-2 rounded hover:bg-accent/5">Grabado patente</button>
                            <button className="w-full text-left px-3 py-2 rounded hover:bg-accent/5">LAVADOS</button>
                            <button className="w-full text-left px-3 py-2 rounded hover:bg-accent/5">Servicio de traslado</button>
                            <button className="w-full text-left px-3 py-2 rounded hover:bg-accent/5">OTROS</button>
                        </div>
                    </aside>

                    <section className="col-span-1 lg:col-span-3">
                        <ServicesArea />
                    </section>
                </div>
            </main>
        </div>
    );
}

export default ClientBookingPage;