import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { confirmReservation } from '@/api/agenda';

export default function ConfirmReservationPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token de confirmación no válido.');
            return;
        }

        confirmReservation(token)
            .then(data => {
                setStatus('success');
                setMessage(data.detail || '¡Reserva confirmada exitosamente!');

                // Redirect to home after 3 seconds
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            })
            .catch(error => {
                console.error("Error confirming reservation:", error);
                setStatus('error');
                // Handle axios error or generic error
                const msg = error.response?.data?.detail || error.message || 'Error al confirmar la reserva.';
                setMessage(msg);
            });
    }, [token, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="max-w-md w-full shadow-lg">
                <CardHeader>
                    <CardTitle className="text-center text-2xl">Confirmación de Reserva</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6 py-6">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                            <Loader2 className="h-16 w-16 text-primary animate-spin" />
                            <p className="text-center text-muted-foreground font-medium">
                                Verificando tu reserva...
                            </p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                            <CheckCircle className="h-20 w-20 text-green-500" />
                            <div className="text-center space-y-2">
                                <p className="text-xl font-bold text-green-700">
                                    ¡Confirmación Exitosa!
                                </p>
                                <p className="text-muted-foreground">
                                    {message}
                                </p>
                                <p className="text-sm text-muted-foreground mt-4 italic">
                                    Serás redirigido a la página principal en unos segundos...
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                            <XCircle className="h-20 w-20 text-red-500" />
                            <div className="text-center space-y-2">
                                <p className="text-xl font-bold text-red-700">
                                    Error de Confirmación
                                </p>
                                <p className="text-muted-foreground">
                                    {message}
                                </p>
                                <Button
                                    onClick={() => navigate('/')}
                                    className="mt-4 w-full"
                                    variant="default"
                                >
                                    Volver al Inicio
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
