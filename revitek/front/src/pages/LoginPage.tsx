import { useState, useEffect } from 'react'; // <-- 1. Importar useState y useEffect
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';


export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // --- 3. Añadir estado de carga local ---
  const [isLoggingIn, setIsLoggingIn] = useState(false); 

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  // Definir a dónde redirigir al usuario tras el login
  const from = location.state?.from?.pathname || '/admin/agenda';

  // --- 4. AÑADIR ESTE useEffect ---
  // Este es el "detector" que reacciona al cambio de estado de autenticación.
  useEffect(() => {
    if (isAuthenticated) {
      // Si el usuario está autenticado, redirigir a la página de admin
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]); // Se ejecuta cada vez que 'isAuthenticated' cambia

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoggingIn(true); // <-- 5. Activar el estado de carga
    try {
      await login(email, password);
      // La redirección se manejará automáticamente por el useEffect
      // La notificación de "éxito" se maneja en AuthContext
    } catch (error) {
      console.error("Fallo el login (manejado en AuthContext):", error);
      // La notificación de "error" se maneja en AuthContext
    } finally {
      setIsLoggingIn(false); // <-- 6. Desactivar el estado de carga
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
          <CardDescription>Inicia sesión para acceder al panel de agenda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@revitek.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {/* --- 7. Modificar el botón --- */}
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};