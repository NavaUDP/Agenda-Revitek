import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ClientBookingPage = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="p-4 border-b border-border flex justify-between items-center">
                <h1 className="text-2xl font-bold text-primary">Agenda tu Servicio</h1>
                {/* CAMBIO: El botón de login ahora vive aquí */}
                <Button asChild variant="outline">
                    <Link to="/login">Login</Link>
                </Button>
            </header>
            
            <main className="p-8">
                <h2 className="text-xl font-semibold mb-4">Paso 1: Selecciona un Servicio</h2>
                
                {/* --- ÁREA DE DESARROLLO FUTURO --- */}
                <div className="p-16 border-2 border-dashed border-border rounded-lg text-center text-muted-foreground">
                    <p>Aquí irán los componentes para el flujo de agendamiento del cliente:</p>
                    <ul className="list-disc list-inside mt-2">
                        <li>Selección de Servicio</li>
                        <li>Selección de Profesional (opcional)</li>
                        <li>Calendario de Horas Disponibles</li>
                        <li>Formulario de Datos del Cliente</li>
                    </ul>
                </div>
                {/* ----------------------------------- */}
            </main>
        </div>
    );
};

export default ClientBookingPage;