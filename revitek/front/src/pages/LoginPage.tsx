import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const LoginPage = () => {
    const { login } = useAuth();
    const navigate  = useNavigate();

    // CAMBIO: La función ahora acepta el rol y redirige condicionalmente
    const handleLogin = (role: 'admin' | 'client') => {
        login(role);
        if (role === 'admin') {
            navigate('/admin');
        } else {
            // Si es un cliente, lo devolvemos a la página de agendamiento
            navigate('/agendar');
        }
    };

    return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center pt-2">
            Selecciona tu tipo de cuenta para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          {/* CAMBIO: Dos botones para simular los dos tipos de login */}
          <Button onClick={() => handleLogin('admin')} className="w-full">
            Entrar como Administrador
          </Button>
          <Button onClick={() => handleLogin('client')} className="w-full" variant="secondary">
            Entrar como Cliente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;