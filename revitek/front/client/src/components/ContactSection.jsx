const ContactSection = () => {
  return (
    <section id="contacto" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            CONTACTO
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Estamos aquí para ayudarte. Contáctanos y agenda tu servicio automotriz.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Información de contacto */}
          <div className="space-y-8">
            <div className="bg-card border border-border rounded-xl p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-bold text-primary mb-6">
                ¿Cómo contactarnos?
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Teléfono</h4>
                    <p className="text-muted-foreground">+56 9 2248 6301</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Horario de Atención</h4>
                    <p className="text-muted-foreground">Lunes a Viernes: 9:00 - 18:00</p>
                    <p className="text-muted-foreground">Sábados: 9:00 - 14:00</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Cobertura</h4>
                    <p className="text-muted-foreground">Retiro y entrega a domicilio</p>
                    <p className="text-muted-foreground">En toda la Región Metropolitana</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-6">
            <div className="bg-primary/5 border-2 border-primary/20 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-primary mb-4">
                ¡Agenda tu servicio ahora!
              </h3>
              <p className="text-muted-foreground mb-6">
                Usa nuestra plataforma de agendamiento online para reservar tu hora de manera rápida y sencilla.
              </p>
              <button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-4 px-6 rounded-lg font-bold text-lg transition-colors shadow-lg hover:shadow-xl"
                onClick={() => window.open('https://revitek.site.agendapro.com/cl', '_blank')}
              >
                AGENDA TU HORA ONLINE
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                ¿Tienes preguntas?
              </h3>
              <p className="text-muted-foreground mb-6">
                Escríbenos por WhatsApp y te responderemos de inmediato. Estamos aquí para ayudarte.
              </p>
              <button
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-bold text-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                onClick={() => window.open('https://api.whatsapp.com/send/?phone=56922486301', '_blank')}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.108"/>
                </svg>
                <span>ESCRIBIR POR WHATSAPP</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;