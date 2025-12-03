import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ServicesList } from '@/components/booking/ServicesList';
import { ServiceBooking } from '@/components/booking/ServiceBooking';

function ClientBookingPage() {
    const [params] = useSearchParams();
    const serviceIdParam = params.get('service_id');
    const servicesParam = params.get('services');

    const initialServices = servicesParam
        ? servicesParam.split(',').map(x => Number(x)).filter(Boolean)
        : (serviceIdParam ? [Number(serviceIdParam)] : []);

    const [activeBookingServices, setActiveBookingServices] = useState<number[] | null>(
        initialServices.length > 0 ? initialServices : null
    );

    const handleContinueToBooking = (selectedIds: number[]) => {
        setActiveBookingServices(selectedIds);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    const handleScheduleSingle = (serviceId: number) => {
        setActiveBookingServices([serviceId]);
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
                <div className="container mx-auto p-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-primary">Agenda tu Servicio</h1>
                    <Button asChild variant="outline">
                        <Link to="/login">Login</Link>
                    </Button>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-8 max-w-5xl">
                {activeBookingServices ? (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <Button
                            variant="ghost"
                            onClick={() => setActiveBookingServices(null)}
                            className="mb-4 pl-0 hover:pl-2 transition-all"
                        >
                            ← Volver a servicios
                        </Button>
                        <ServiceBooking
                            selectedServiceIds={activeBookingServices}
                            onClose={() => setActiveBookingServices(null)}
                        />
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-left-4">
                        <div className="mb-8 text-center">
                            <h2 className="text-3xl font-bold mb-2">Nuestros Servicios</h2>
                            <p className="text-muted-foreground">Selecciona los servicios que deseas agendar</p>
                        </div>
                        <ServicesList
                            onContinue={handleContinueToBooking}
                            onScheduleSingle={handleScheduleSingle}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}

export default ClientBookingPage;