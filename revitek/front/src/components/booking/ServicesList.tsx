import { useState, useEffect } from 'react';
import { listAllServices } from '@/api/servicios';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Service {
    id: number;
    nombre: string;
    descripcion: string;
    duracion_min: number;
    precio: number;
    categoria: string;
}

interface ServicesListProps {
    onContinue: (selectedIds: number[]) => void;
    onScheduleSingle: (serviceId: number) => void;
}

export function ServicesList({ onContinue, onScheduleSingle }: ServicesListProps) {
    const [services, setServices] = useState<Service[]>([]);
    const [groups, setGroups] = useState<Record<string, Service[]>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [selectedServices, setSelectedServices] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        listAllServices()
            .then((data) => {
                if (!data || !Array.isArray(data)) {
                    setServices([]);
                    return;
                }

                const normalized = data.map((s: any) => ({
                    id: s.id,
                    nombre: s.name,
                    descripcion: s.description,
                    duracion_min: s.duration_min,
                    precio: s.price,
                    categoria: (typeof s.category === 'string' ? s.category : s.category?.name) ?? 'OTROS',
                }));

                setServices(normalized);

                const grouped: Record<string, Service[]> = {};
                normalized.forEach((s) => {
                    const cat = s.categoria?.trim().toUpperCase() || 'OTROS';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(s);
                });

                setGroups(grouped);

                // Expand first category by default
                const first = Object.keys(grouped)[0];
                const exp: Record<string, boolean> = {};
                Object.keys(grouped).forEach((k) => { exp[k] = k === first; });
                setExpanded(exp);
            })
            .catch((err) => {
                console.error("Error cargando servicios:", err);
            })
            .finally(() => setLoading(false));
    }, []);

    const toggleCategory = (cat: string) => {
        setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
    };

    const toggleSelectService = (id: number) => {
        setSelectedServices((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const desiredOrder = [
        'SERVICIO REVISION TÉCNICA',
        'GRABADO PATENTE',
        'LAVADOS',
        'SERVICIO DE TRASLADO',
        'OTROS',
    ];

    const sortedCategories = Object.keys(groups).sort((a, b) => {
        const ia = desiredOrder.indexOf(a);
        const ib = desiredOrder.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });

    if (loading) return <div className="p-8 text-center">Cargando servicios...</div>;

    return (
        <div>
            {selectedServices.length > 0 && (
                <div className="sticky top-4 z-10 mb-6 p-4 bg-card rounded-lg border border-border shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-muted-foreground">Seleccionados:</span>
                        {selectedServices.map((sid) => {
                            const svc = services.find(s => s.id === sid);
                            return (
                                <div key={sid} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">
                                    {svc?.nombre || sid}
                                </div>
                            );
                        })}
                    </div>
                    <Button onClick={() => onContinue(selectedServices)}>
                        Continuar a reserva
                    </Button>
                </div>
            )}

            <div className="space-y-4">
                {sortedCategories.map((cat) => (
                    <div key={cat} className="rounded-lg border border-border overflow-hidden bg-card">
                        <button
                            onClick={() => toggleCategory(cat)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                            <span className="font-semibold text-sm">{cat}</span>
                            {expanded[cat] ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </button>

                        {expanded[cat] && (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {groups[cat].map((s) => (
                                    <div key={s.id} className="group relative p-4 border rounded-lg bg-background hover:border-primary/50 transition-colors">
                                        <div className="absolute top-3 right-3">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => toggleSelectService(s.id)}>
                                                        {selectedServices.includes(s.id) ? 'Deseleccionar' : 'Seleccionar'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        <div className="flex flex-col h-full">
                                            <div className="mb-4 pr-8">
                                                <h3 className="font-semibold text-lg leading-tight mb-2">{s.nombre}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span>{Math.round((s.duracion_min || 60) / 60)} hrs</span>
                                                    <span>•</span>
                                                    <span>En domicilio</span>
                                                </div>
                                                {!(cat === 'OTROS' && s.precio === 0) && (
                                                    <div className="mt-2 font-semibold text-primary">
                                                        ${s.precio?.toLocaleString()}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-auto flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`select-${s.id}`}
                                                        checked={selectedServices.includes(s.id)}
                                                        onCheckedChange={() => toggleSelectService(s.id)}
                                                    />
                                                    <label htmlFor={`select-${s.id}`} className="text-sm cursor-pointer select-none">
                                                        Seleccionar
                                                    </label>
                                                </div>
                                                <Button
                                                    onClick={() => onScheduleSingle(s.id)}
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                >
                                                    Agendar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
