import { Button } from "@/components/ui/button";
import { Phone, MessageSquare } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo y descripción */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-primary">REVITEK</h3>
            <p className="text-sm text-muted-foreground">
              Servicios automotrices de calidad con retiro y entrega a domicilio. 
              Tu vehículo en las mejores manos profesionales.
            </p>
          </div>

          {/* Enlaces rápidos */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Enlaces Rápidos</h4>
            <nav className="space-y-2">
              <a href="#inicio" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Inicio
              </a>
              <a href="#servicios" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Nuestros Servicios
              </a>
              <a href="#nosotros" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Nosotros
              </a>
              <a href="#contacto" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Contacto
              </a>
            </nav>
          </div>

          {/* Contacto */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-foreground">Contacto</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">+56 9 2248 6301</span>
              </div>
              
              <div className="space-y-2">
                <Button 
                  size="sm"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => window.open('https://api.whatsapp.com/send/?phone=56922486301', '_blank')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                
                <Button 
                  size="sm"
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => window.open('https://revitek.site.agendapro.com/cl', '_blank')}
                >
                  Agenda tu Hora
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-border mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">
              © {currentYear} REVITEK Servicios Automotriz. Todos los derechos reservados.
            </p>
            
            <p className="text-sm text-muted-foreground">
              Servicios profesionales para tu vehículo
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;