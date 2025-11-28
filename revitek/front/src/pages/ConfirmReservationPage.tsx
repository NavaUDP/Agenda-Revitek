import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

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

        // Call backend confirmation endpoint
        fetch(`http://localhost:8000/agenda/confirm/${token}/`)
            .then(res => {
                if (res.ok) {
                    return res.json();
                } else {
                    return res.json().then(data => Promise.reject(data));
                }
            })
            .then(data => {
                setStatus('success');
                setMessage(data.detail || '¡Reserva confirmada exitosamente!');

                // Redirect to home after 3 seconds
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            })
            .catch(error => {
                setStatus('error');
                setMessage(error.detail || 'Error al confirmar la reserva. Por favor contacta al administrador.');
            });
    }, [token, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle className="text-center">Confirmación de Reserva</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    {status === 'loading' && (
                        <>
                            <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
                            <p className="text-center text-muted-foreground">
                                Verificando tu reserva...
                            </p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle className="h-16 w-16 text-green-500" />
                            <div className="text-center space-y-2">
                                <p className="text-lg font-semibold text-green-700">
                                    ¡Confirmación Exitosa!
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-4">
                                    Serás redirigido a la página principal en 3 segundos...
                                </p>
                            </div>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <XCircle className="h-16 w-16 text-red-500" />
                            <div className="text-center space-y-2">
                                <p className="text-lg font-semibold text-red-700">
                                    Error de Confirmación
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {message}
                                </p>
                                <button
                                    onClick={() => navigate('/')}
                                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                >
                                    Volver al Inicio
                                </button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
