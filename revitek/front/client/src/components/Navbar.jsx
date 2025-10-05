import { useState } from "react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img 
              src="/logo.png" 
              alt="Revitek Logo" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-2xl font-black text-primary tracking-wide">REVITEK</h1>
              <p className="text-xs text-muted-foreground font-medium">SERVICIOS AUTOMOTRIZ</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#inicio" className="text-foreground hover:text-primary transition-colors font-medium">
              Inicio
            </a>
            <a href="#servicios" className="text-foreground hover:text-primary transition-colors font-medium">
              Servicios
            </a>
            <a href="#nosotros" className="text-foreground hover:text-primary transition-colors font-medium">
              Nosotros
            </a>
            <a href="#contacto" className="text-foreground hover:text-primary transition-colors font-medium">
              Contacto
            </a>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:block">
            <button
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-semibold transition-colors"
              onClick={() => window.open('https://revitek.site.agendapro.com/cl', '_blank')}
            >
              Agenda tu Hora
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-foreground hover:text-primary transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-background border-t border-border">
              <a href="#inicio" className="block px-3 py-2 text-foreground hover:text-primary transition-colors">
                Inicio
              </a>
              <a href="#servicios" className="block px-3 py-2 text-foreground hover:text-primary transition-colors">
                Servicios
              </a>
              <a href="#nosotros" className="block px-3 py-2 text-foreground hover:text-primary transition-colors">
                Nosotros
              </a>
              <a href="#contacto" className="block px-3 py-2 text-foreground hover:text-primary transition-colors">
                Contacto
              </a>
              <button
                className="w-full mt-4 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-semibold transition-colors"
                onClick={() => window.open('https://revitek.site.agendapro.com/cl', '_blank')}
              >
                Agenda tu Hora
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;