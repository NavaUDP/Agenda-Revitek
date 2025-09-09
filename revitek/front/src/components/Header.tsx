import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import revitekLogo from "@/assets/revitek-logo.jpg";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  const services = [
    "SERVICIOS PRT",
    "TRASLADO DE VEHICULO", 
    "LAVADO Y ASPIRADO",
    "GRABADO DE VIDRIOS",
    "PULIDO DE FOCOS",
    "BORRADO DE PATENTES",
    "COMPRA Y VENTA",
    "MANTENCION POR KM"
  ];

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-background/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img 
              src={revitekLogo} 
              alt="REVITEK SERVICIOS AUTOMOTRIZ" 
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <a href="#inicio" className="text-foreground hover:text-primary transition-colors font-medium">
              INICIO
            </a>
            
            <div className="relative group">
              <button 
                className="flex items-center space-x-1 text-foreground hover:text-primary transition-colors font-medium"
                onMouseEnter={() => setIsServicesOpen(true)}
                onMouseLeave={() => setIsServicesOpen(false)}
              >
                <span>NUESTROS SERVICIOS</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {isServicesOpen && (
                <div 
                  className="absolute top-full left-0 w-64 bg-card border border-border rounded-lg shadow-lg py-2 mt-1"
                  onMouseEnter={() => setIsServicesOpen(true)}
                  onMouseLeave={() => setIsServicesOpen(false)}
                >
                  {services.map((service) => (
                    <a 
                      key={service}
                      href={`#${service.toLowerCase().replace(/\s+/g, '-')}`}
                      className="block px-4 py-2 text-sm text-foreground hover:bg-muted hover:text-primary transition-colors"
                    >
                      {service}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <a href="#autos-asegurados" className="text-foreground hover:text-primary transition-colors font-medium">
              AUTOS ASEGURADOS
            </a>
            
            <a href="#radio-atencion" className="text-foreground hover:text-primary transition-colors font-medium">
              RADIO ATENCION
            </a>
            
            <a href="#nosotros" className="text-foreground hover:text-primary transition-colors font-medium">
              NOSOTROS
            </a>
            
            <a href="#contacto" className="text-foreground hover:text-primary transition-colors font-medium">
              CONTACTO
            </a>

            <Button 
              variant="default" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              onClick={() => window.open('https://api.whatsapp.com/send/?phone=56922486301', '_blank')}
            >
              💬 WHATSAPP
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-border">
            <nav className="py-4 space-y-4">
              <a href="#inicio" className="block text-foreground hover:text-primary transition-colors font-medium">
                INICIO
              </a>
              
              <div>
                <p className="font-medium text-foreground mb-2">NUESTROS SERVICIOS</p>
                <div className="pl-4 space-y-2">
                  {services.map((service) => (
                    <a 
                      key={service}
                      href={`#${service.toLowerCase().replace(/\s+/g, '-')}`}
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {service}
                    </a>
                  ))}
                </div>
              </div>

              <a href="#autos-asegurados" className="block text-foreground hover:text-primary transition-colors font-medium">
                AUTOS ASEGURADOS
              </a>
              
              <a href="#radio-atencion" className="block text-foreground hover:text-primary transition-colors font-medium">
                RADIO ATENCION
              </a>
              
              <a href="#nosotros" className="block text-foreground hover:text-primary transition-colors font-medium">
                NOSOTROS
              </a>
              
              <a href="#contacto" className="block text-foreground hover:text-primary transition-colors font-medium">
                CONTACTO
              </a>

              <Button 
                variant="default" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                onClick={() => window.open('https://api.whatsapp.com/send/?phone=56922486301', '_blank')}
              >
                💬 WHATSAPP
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;