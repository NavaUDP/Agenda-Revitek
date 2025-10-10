import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { listAsignaciones } from '@/api/servicios';
import { listSlots, createReserva } from '@/api/agenda';
import { useEffect, useState } from 'react';

const ClientBookingPage = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="p-4 border-b border-border flex justify-between items-center">
                <h1 className="text-2xl font-bold text-primary">Agenda tu Servicio</h1>
                {/* CAMBIO: El botón de login ahora vive aquí */}
                <Button asChild variant="outline">
                    <Link to="/login">Login</Link>
                </Button>
            </header>
            
                <main className="p-8">
                                        <h2 className="text-xl font-semibold mb-4">Agendar servicio</h2>
                                        <ServiceBooking />
                                </main>
        </div>
    );
};

export default ClientBookingPage;

        function ServiceBooking() {
            const [params] = useSearchParams();
            const serviceId = params.get('service_id');
            const [assigns, setAssigns] = useState<any[]>([]);
            const [slots, setSlots] = useState<any[]>([]);
            const [selectedProf, setSelectedProf] = useState<number|undefined>(undefined);

            useEffect(() => {
                if (!serviceId) return;
                listAsignaciones({ servicio_id: Number(serviceId) }).then((data) => {
                    setAssigns(data);
                    if (data.length) setSelectedProf(data[0].profesional);
                });
            }, [serviceId]);

            useEffect(() => {
                if (!selectedProf) return;
                const fecha = new Date().toISOString().slice(0,10);
                listSlots({ profesionalId: selectedProf, fecha }).then(setSlots);
            }, [selectedProf]);

            async function reservar(slotId:number) {
                if (!selectedProf || !serviceId) return;
                const payload = {
                    cliente: { nombre: 'Anon', email: null, telefono: '' },
                    titular_nombre: 'Anon',
                    titular_email: null,
                    titular_tel: '',
                    profesional_id: selectedProf,
                    servicios: [{ servicio_id: Number(serviceId), profesional_id: selectedProf }],
                    slot_id: slotId,
                    nota: 'Reservado desde frontend stub'
                };
                try {
                    const res = await createReserva(payload);
                    alert('Reserva creada: ' + res.id);
                } catch (e) {
                    alert('Error al crear reserva');
                }
            }

            if (!serviceId) return (<div className="p-8 text-muted-foreground">Selecciona un servicio desde la página de servicios.</div>);

            return (
                <div>
                    <div className="mb-4">
                        <h3 className="text-lg font-medium">Profesionales que ofrecen este servicio</h3>
                        <div className="space-y-2 mt-2">
                            {assigns.length === 0 && <div className="text-muted-foreground">No hay profesionales asignados</div>}
                            {assigns.map(a => (
                                <div key={a.id} className={`p-3 border ${selectedProf===a.profesional? 'border-primary':'border-border'} rounded`}>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-semibold">Profesional #{a.profesional}</div>
                                            <div className="text-sm text-muted-foreground">Duración: {a.duracion_override_min || a.servicio.duracion_min} min</div>
                                        </div>
                                        <div>
                                            <Button variant={selectedProf===a.profesional? 'default':'outline'} onClick={() => setSelectedProf(a.profesional)}>Seleccionar</Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium mb-2">Horarios disponibles (hoy)</h3>
                        {slots.length === 0 && <div className="text-muted-foreground">No hay slots disponibles para hoy</div>}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {slots.map(s => (
                                <div key={s.id} className="p-3 border rounded">
                                    <div className="font-semibold">{new Date(s.inicio).toLocaleString()}</div>
                                    <div className="text-sm text-muted-foreground">Duración aprox. {(new Date(s.fin).getTime()-new Date(s.inicio).getTime())/60000} min</div>
                                    <div className="mt-2"><Button onClick={() => reservar(s.id)}>Reservar</Button></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }