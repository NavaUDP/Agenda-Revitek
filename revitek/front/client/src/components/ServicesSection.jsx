import ServiceCard from "./ServiceCard";

const ServicesSection = () => {
  const services = [
    {
      title: "SERVICIO DE REVISIÓN TÉCNICA CON RETIRO EN DOMICILIO",
      description: "Servicio completo de revisión técnica vehicular",
      features: [
        "Retiramos el vehículo en tu domicilio",
        "Lo llevamos a la PRT",
        "Podrás ver dónde está tu vehículo en vivo",
        "Lo retornamos con documentos plastificados"
      ],
      image: "/servicio-prt.jpg",
      link: "https://revitek.site.agendapro.com/cl"
    },
    {
      title: "TRASLADO DE VEHICULO",
      description: "Servicio de traslado seguro de vehículos",
      features: [
        "Vamos al domicilio por tu vehículo",
        "Se revisa completo y lo trasladamos andando",
        "A donde quieras",
        "Precio según distancia"
      ],
      image: "/traslado-vehiculo.jpg",
      link: "https://api.whatsapp.com/send/?phone=56922486301"
    },
    {
      title: "LAVADO Y ASPIRADO",
      description: "Servicio completo de lavado vehicular",
      features: [
        "Retiramos a domicilio tu vehículo",
        "Lo llevamos a nuestro centro de lavado",
        "LAVADO, ASPIRADO, SECADO Y ENCERADO",
        "Podrás ver dónde está tu vehículo"
      ],
      image: "/lavado-aspirado.jpg",
      link: "https://api.whatsapp.com/send/?phone=56922486301"
    },
    {
      title: "GRABADO DE VIDRIOS",
      description: "Grabado de patentes en vidrios del vehículo",
      features: [
        "Retiramos a domicilio tu auto",
        "Grabamos las patentes en todos los vidrios",
        "Se devuelve con el servicio realizado",
        "SE GRABAN CON ÁCIDO"
      ],
      image: "/grabado-vidrios.jpg",
      link: "https://api.whatsapp.com/send/?phone=56922486301"
    },
    {
      title: "PULIDO DE FOCOS",
      description: "Restauración de focos opacos",
      features: [
        "Vamos a tu domicilio",
        "Vemos el estado de los focos del vehículo",
        "Procedemos al pulido y aclarado",
        "De las micas de los focos"
      ],
      image: "/pulido-focos.jpg",
      link: "https://api.whatsapp.com/send/?phone=56922486301"
    },
    {
      title: "MANTENCIÓN POR KM",
      description: "Mantención programada según kilometraje",
      features: [
        "Cotiza con nosotros la mantención",
        "De tu vehículo por km",
        "Servicio profesional",
        "Repuestos de calidad"
      ],
      image: "/mantencion-km.jpg",
      link: "https://api.whatsapp.com/send/?phone=56922486301"
    }
  ];

  return (
    <section id="servicios" className="py-20 bg-muted/30">
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
            <div key={index} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <ServiceCard {...service} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;