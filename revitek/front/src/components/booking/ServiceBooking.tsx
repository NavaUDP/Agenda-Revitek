import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { toast } from 'sonner';
import { format, addDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { getAggregatedAvailability, createReservation, ReservationPayload } from '@/api/agenda';
import { listRegions, listCommunes, lookupClient } from '@/api/clientes';
import { Region, Commune } from '@/types/clients';
import { BookingCalendar } from './BookingCalendar';

const bookingSchema = z.object({
    nombre: z.string().min(1, 'Nombre es requerido'),
    apellido: z.string().min(1, 'Apellido es requerido'),
    email: z.string().email('Email inválido'),
    telefono: z.string().min(8, 'Teléfono debe tener al menos 8 dígitos'),
    regionId: z.string().min(1, 'Región es requerida'),
    communeId: z.string().min(1, 'Comuna es requerida'),
    calle: z.string().min(1, 'Calle es requerida'),
    numero: z.string().min(1, 'Número es requerido'),
    patente: z.string().min(1, 'Patente es requerida'),
    marca: z.string().min(1, 'Marca es requerida'),
    modelo: z.string().min(1, 'Modelo es requerido'),
    observaciones: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface ServiceBookingProps {
    selectedServiceIds: number[];
    onClose: () => void;
}

export function ServiceBooking({ selectedServiceIds, onClose }: ServiceBookingProps) {
    const { executeRecaptcha } = useGoogleReCaptcha();
    const [aggregatedSlots, setAggregatedSlots] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const tomorrow = addDays(new Date(), 1);
        return format(tomorrow, 'yyyy-MM-dd');
    });
    const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
    const [regions, setRegions] = useState<Region[]>([]);
    const [communes, setCommunes] = useState<Commune[]>([]);
    const [filteredCommunes, setFilteredCommunes] = useState<Commune[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const formRef = useRef<HTMLDivElement>(null);

    const form = useForm<BookingFormValues>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            nombre: '',
            apellido: '',
            email: '',
            telefono: '',
            regionId: '',
            communeId: '',
            calle: '',
            numero: '',
            patente: '',
            marca: '',
            modelo: '',
            observaciones: '',
        }
    });

    const watchedRegionId = form.watch('regionId');

    // Load regions and communes
    useEffect(() => {
        Promise.all([listRegions(), listCommunes()])
            .then(([regs, coms]) => {
                setRegions(regs);
                setCommunes(coms);
            })
            .catch(err => console.error("Error loading regions/communes", err));
    }, []);

    // Filter communes
    useEffect(() => {
        if (watchedRegionId) {
            const filtered = communes.filter(c => c.region.id === Number(watchedRegionId));
            setFilteredCommunes(filtered);
        } else {
            setFilteredCommunes([]);
        }
    }, [watchedRegionId, communes]);

    // Load slots
    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!selectedServiceIds || selectedServiceIds.length === 0) {
                setAggregatedSlots([]);
                return;
            }
            try {
                const data = await getAggregatedAvailability(selectedServiceIds, selectedDate);
                if (cancelled) return;
                const norm = (data || []).map((d: any) => ({
                    inicio: d.inicio,
                    fin: d.fin,
                    professionals: d.professionals || [],
                    slot_ids: d.slot_ids || [],
                }));
                setAggregatedSlots(norm);
            } catch (e) {
                console.error('aggregated availability error', e);
                setAggregatedSlots([]);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [selectedServiceIds, selectedDate]);

    const handleSelectSlot = (slot: any) => {
        setSelectedSlot(slot);
        setShowForm(true);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleLookup = async (field: 'email' | 'telefono') => {
        const value = form.getValues(field);
        if (!value || value.length < 4) return;

        try {
            const params = field === 'email' ? { email: value } : { phone: value };
            const data = await lookupClient(params);

            if (data.found) {
                if (data.first_name) form.setValue('nombre', data.first_name);
                if (data.last_name) form.setValue('apellido', data.last_name);
                if (data.email) form.setValue('email', data.email);
                if (data.phone) form.setValue('telefono', data.phone.replace(/^(\+?56)/, ''));

                if (data.vehicle) {
                    if (data.vehicle.license_plate) form.setValue('patente', data.vehicle.license_plate);
                    if (data.vehicle.brand) form.setValue('marca', data.vehicle.brand);
                    if (data.vehicle.model) form.setValue('modelo', data.vehicle.model);
                }

                if (data.address) {
                    if (data.address.street) form.setValue('calle', data.address.street);
                    if (data.address.number) form.setValue('numero', data.address.number);
                    // Note: Region/Commune auto-fill is tricky without ID mapping from backend
                }

                toast.success("¡Datos encontrados! Hemos completado el formulario por ti.");
            }
        } catch (e) {
            // Silent fail
        }
    };

    const onSubmit = async (values: BookingFormValues) => {
        if (!selectedSlot) return;

        const professional_id = selectedSlot.professionals[0];
        const slot_id = selectedSlot.slot_ids[0];

        if (!slot_id) {
            toast.error('No se encontró un slot válido.');
            return;
        }

        setLoading(true);

        try {
            // Intentar obtener token de reCAPTCHA si está disponible
            let recaptchaToken = '';
            if (executeRecaptcha) {
                try {
                    recaptchaToken = await executeRecaptcha('submit_reservation');
                    console.log('✅ reCAPTCHA token obtenido');
                } catch (err) {
                    console.warn('⚠️  reCAPTCHA no disponible (desarrollo):', err);
                    // Continuar sin reCAPTCHA en desarrollo
                }
            }
        
            const payload: ReservationPayload = {
                client: {
                    email: values.email,
                    first_name: values.nombre,
                    last_name: values.apellido,
                    phone: values.telefono
                },
                vehicle: {
                    license_plate: values.patente.toUpperCase(),
                    brand: values.marca,
                    model: values.modelo,
                },
                address: {
                    street: values.calle,
                    number: values.numero,
                    commune_id: Number(values.communeId),
                    alias: "Principal"
                },
                slot_id,
                professional_id,
                services: selectedServiceIds.map(id => ({
                    service_id: id,
                    professional_id
                })),
                note: values.observaciones || "",
                recaptcha_token: recaptchaToken  // Puede estar vacío en desarrollo
            };
        
            const res = await createReservation(payload);
            toast.success(`Reserva creada exitosamente! Número de reserva: ${res.id}`);
            onClose();
        } catch (e: any) {
            console.error(e);
            const msg = e?.response?.data ? JSON.stringify(e.response.data) : e.message;
            toast.error('Error al crear reserva: ' + msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {!showForm && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="col-span-1">
                        <div className="bg-card rounded-lg border border-border p-4">
                            <h3 className="font-semibold mb-4">Seleccionar fecha</h3>
                            <BookingCalendar
                                selectedDate={selectedDate}
                                onSelectDate={setSelectedDate}
                                minDate={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                            />
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <div className="bg-card rounded-lg border border-border p-4 h-full">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold">
                                    Horarios disponibles ({format(parseISO(selectedDate), "d 'de' MMMM", { locale: es })})
                                </h3>
                                <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
                            </div>

                            {aggregatedSlots.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    No hay horarios disponibles para esta fecha.
                                </div>
                            ) : (
                                <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                                    {['Mañana', 'Tarde', 'Noche'].map(period => {
                                        const slots = aggregatedSlots.filter(s => {
                                            const hour = new Date(s.inicio).getHours();
                                            if (period === 'Mañana') return hour < 12;
                                            if (period === 'Tarde') return hour >= 12 && hour < 18;
                                            return hour >= 18;
                                        });

                                        if (slots.length === 0) return null;

                                        return (
                                            <div key={period}>
                                                <h4 className="text-sm font-medium text-muted-foreground mb-2 sticky top-0 bg-card py-1">{period}</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {slots.map((s, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 border rounded-md hover:border-primary transition-colors">
                                                            <div>
                                                                <div className="font-semibold">
                                                                    {format(new Date(s.inicio), 'HH:mm')}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {s.professionals.length} profesional(es)
                                                                </div>
                                                            </div>
                                                            <Button size="sm" onClick={() => handleSelectSlot(s)}>
                                                                Seleccionar
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showForm && selectedSlot && (
                <Card ref={formRef} className="border-2 border-primary/20 animate-in fade-in slide-in-from-bottom-4">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Confirmar Reserva</span>
                            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                                Volver a horarios
                            </Button>
                        </CardTitle>
                        <p className="text-muted-foreground">
                            Horario: {format(new Date(selectedSlot.inicio), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="nombre"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nombre *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Juan" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="apellido"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Apellido *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Pérez" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="email" placeholder="juan@example.com" onBlur={() => handleLookup('email')} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="telefono"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Teléfono *</FormLabel>
                                                <div className="flex">
                                                    <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground border-input text-sm">
                                                        +56
                                                    </div>
                                                    <FormControl>
                                                        <Input {...field} className="rounded-l-none" placeholder="9 1234 5678" onBlur={() => handleLookup('telefono')} />
                                                    </FormControl>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="regionId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Región *</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccione región" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {regions.map(r => (
                                                            <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="communeId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Comuna *</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={!watchedRegionId}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccione comuna" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {filteredCommunes.map(c => (
                                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="md:col-span-2 grid grid-cols-3 gap-4">
                                        <div className="col-span-2">
                                            <FormField
                                                control={form.control}
                                                name="calle"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Calle *</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Av. Providencia" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div>
                                            <FormField
                                                control={form.control}
                                                name="numero"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Número *</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="1234" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="patente"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Patente *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="ABCD12" className="uppercase" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="marca"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Marca *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Toyota" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="modelo"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Modelo *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Yaris" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="md:col-span-2">
                                        <FormField
                                            control={form.control}
                                            name="observaciones"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Observaciones</FormLabel>
                                                    <FormControl>
                                                        <Textarea {...field} placeholder="Información adicional..." />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4">
                                    <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={loading}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Confirmar Reserva
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
