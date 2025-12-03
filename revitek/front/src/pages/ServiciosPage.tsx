import { useServices } from '@/hooks/useServices';
import ServiceCard from '@/components/ServiceCard';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const ServiciosPage = () => {
  const { services, loading, error } = useServices({ publicOnly: true });
  const nav = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h2 className="text-xl font-semibold text-destructive mb-2">Error al cargar servicios</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Nuestros Servicios</h1>

        {services.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No hay servicios disponibles en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <ServiceCard
                key={s.id}
                title={s.name}
                description={s.category?.name || 'Servicio General'}
                features={[
                  `Duración: ${s.duration_min} min`,
                  s.price ? `Precio: $${s.price.toLocaleString('es-CL')}` : 'Precio a consultar'
                ]}
                image={s.image_url || "/assets/servicio-prt.jpg"} // Fallback image if none provided
                link={`/agendar?service_id=${s.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiciosPage;