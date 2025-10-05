import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MessageSquare, MapPin, Clock } from "lucide-react";

const ContactSection = () => {
  return (
    <section id="contacto" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            CONTACTO
          </h2>
          <p className="text-xl text-muted-foreground">
            Estamos aquí para ayudarte con todos tus servicios automotrices
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Información de contacto */}
          <div className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-foreground">
                  <Phone className="h-6 w-6 text-primary" />
                  <span>Teléfono</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">+56 9 2248 6301</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-foreground">
                  <MessageSquare className="h-6 w-6 text-primary" />
                  <span>WhatsApp</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Contáctanos directamente por WhatsApp para agendar tu servicio
                </p>
                <Button 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => window.open('https://api.whatsapp.com/send/?phone=56922486301', '_blank')}
                >
                  💬 Enviar mensaje
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-foreground">
                  <Clock className="h-6 w-6 text-primary" />
                  <span>Horarios de Atención</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-muted-foreground">
                  <p><strong>Lunes a Viernes:</strong> 08:00 - 18:00</p>
                  <p><strong>Sábados:</strong> 08:00 - 14:00</p>
                  <p><strong>Domingos:</strong> Cerrado</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-foreground">
                  <MapPin className="h-6 w-6 text-primary" />
                  <span>Ubicación</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Servicios a domicilio en toda la Región Metropolitana
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Call to action principal */}
          <div className="flex items-center justify-center">
            <Card className="w-full max-w-md bg-primary/10 border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-foreground">
                  ¿Necesitas nuestros servicios?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-6">
                <p className="text-muted-foreground">
                  Agenda tu cita ahora y déjanos cuidar de tu vehículo
                </p>
                
                <div className="space-y-4">
                  <Button 
                    size="lg"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                    onClick={() => window.open('https://revitek.site.agendapro.com/cl', '_blank')}
                  >
                    AGENDA TU HORA
                  </Button>
                  
                  <Button 
                    size="lg"
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={() => window.open('https://api.whatsapp.com/send/?phone=56922486301', '_blank')}
                  >
                    💬 WhatsApp
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  <strong>¡No te preocupes, REVITEK lo hace por ti!</strong>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;