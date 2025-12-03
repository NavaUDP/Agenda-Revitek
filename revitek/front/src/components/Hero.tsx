import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section
      className="relative h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url(${heroBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-background/80 to-background/60" />

      <div className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo Principal */}
        <div className="mb-8 animate-slide-up">
          <h1 className="text-6xl md:text-8xl font-black text-primary mb-4 tracking-wider drop-shadow-lg">
            REVITEK
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-foreground tracking-wide">
            SERVICIOS AUTOMOTRIZ
          </p>
        </div>

        {/* Call to Action Principal */}
        <div className="bg-primary/95 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-2xl animate-slide-up">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            AGENDA TU HORA
          </h2>

          <p className="text-xl md:text-2xl font-semibold text-primary-foreground mb-2">
            ¡No esperes más!
          </p>

          <p className="text-lg text-primary-foreground/90 mb-8">
            En breve nos pondremos en contacto contigo
          </p>

          <Button
            asChild
            size="lg"
            variant="secondary"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 py-4 text-lg font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 animate-glow"
          >
            <Link to="/agendar">AGENDA TU HORA AQUÍ</Link>
          </Button>
        </div>

        {/* Texto de confianza */}
        <div className="mt-16 animate-slide-up">
          <h3 className="text-2xl md:text-3xl font-bold text-primary tracking-wide">
            NO TE PREOCUPES, REVITEK LO HACE POR TI
          </h3>
        </div>
      </div>

      {/* Elementos decorativos */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 right-20 w-16 h-16 bg-primary/15 rounded-full blur-lg animate-pulse delay-500" />
    </section>
  );
};

export default Hero;