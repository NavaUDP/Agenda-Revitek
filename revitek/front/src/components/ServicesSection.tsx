import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ServiceCard from "./ServiceCard";
import { listAllServices } from "@/api/servicios";
import { Service } from "@/types/services";
import { Button } from "@/components/ui/button";

// Images
import servicioPrt from "@/assets/servicio-prt.jpg";
import trasladoVehiculo from "@/assets/traslado-vehiculo.jpg";
import lavadoAspirado from "@/assets/lavado-aspirado.jpg";
import grabadoVidrios from "@/assets/grabado-vidrios.jpg";
import pulidoFocos from "@/assets/pulido-focos.jpg";
import mantencionKm from "@/assets/mantencion-km.jpg";
import heroBg from "@/assets/hero-bg.jpg"; // Fallback

const ServicesSection = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAllServices()
      .then((data) => {
        // Filter only active services if needed, though backend might already do it or we want all.
        // Let's assume we want active ones.
        setServices(data.filter(s => s.active !== false));
      })
      .catch((err) => console.error("Error loading services:", err))
      .finally(() => setLoading(false));
  }, []);

  // Helper to assign images based on service name (simple heuristic)
  const getImageForService = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("revisión") || lower.includes("prt")) return servicioPrt;
    if (lower.includes("traslado")) return trasladoVehiculo;
    if (lower.includes("lavado")) return lavadoAspirado;
    if (lower.includes("grabado")) return grabadoVidrios;
    if (lower.includes("foco") || lower.includes("pulido")) return pulidoFocos;
    if (lower.includes("mantención") || lower.includes("km")) return mantencionKm;
    return heroBg;
  };

  if (loading) {
    return <div className="py-20 text-center">Cargando servicios...</div>;
  }

  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            NUESTROS SERVICIOS
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Ofrecemos servicios automotrices de calidad con retiro y entrega a domicilio.
            Tu vehículo en las mejores manos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={service.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <ServiceCard
                title={service.name}
                description={service.description || "Servicio profesional garantizado."}
                features={[]} // Backend doesn't provide features list yet, maybe parse description?
                image={getImageForService(service.name)}
                // We pass the internal link path instead of an external URL
                link={`/agendar?service_id=${service.id}`}
              />
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button asChild size="lg" className="font-bold text-lg">
            <Link to="/agendar">Ver todos los servicios</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;