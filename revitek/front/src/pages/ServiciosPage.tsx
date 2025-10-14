import { useEffect, useState } from 'react';
import ServiceCard from '@/components/ServiceCard';
import { listAllServicios } from '@/api/servicios';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const ServiciosPage = () => {
  const [servicios, setServicios] = useState<any[]>([]);
  const nav = useNavigate();

  useEffect(() => {
    listAllServicios().then(setServicios).catch(() => setServicios([]));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Servicios</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicios.map((s: any) => (
            <div key={s.id}>
              <ServiceCard
                title={s.nombre}
                description={s.categoria || s.descripcion || ''}
                features={[`Duración: ${s.duracion_min} min`]}
                image={'/assets/servicio-prt.jpg'}
                link={undefined}
              />
              <div className="mt-4">
                <Button onClick={() => nav(`/agendar?service_id=${s.id}`)} className="w-full">Reservar</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServiciosPage;
