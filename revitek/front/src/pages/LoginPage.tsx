import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth'; // (Asumo que este hook usa tu AuthContext)
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input'; // Necesitarás un componente Input
import { Label } from '@/components/ui/label'; // Necesitarás un componente Label

const LoginPage = () => {
    // 1. Traemos la función de login, el estado de carga y el error del contexto
    const { login, loading, error } = useAuth();
    const navigate = useNavigate();

    // 2. Estados locales para el formulario
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // 3. Handler para el envío del formulario
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // Evita que la página se recargue

        try {
            // Llama a la función de login de AuthProvider con los datos del form
            await login(email, password);

            // Si el login es exitoso (no hay error), redirige al panel de admin
            navigate('/admin');

        } catch (err) {
            // El error ya lo maneja el AuthProvider
            // y se mostrará en la variable 'error'
            console.error("Fallo el intento de login");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Panel de Admin</CardTitle>
                    <CardDescription className="text-center pt-2">
                        Ingresa tus credenciales para continuar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* 4. Formulario de Login */}
                    <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@revitek.cl"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {/* 5. Muestra el error si existe */}
                        {error && (
                            <p className="text-sm text-center text-red-500">{error}</p>
                        )}

                        {/* 6. Botón de envío deshabilitado mientras carga */}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Ingresando...' : 'Entrar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default LoginPage;