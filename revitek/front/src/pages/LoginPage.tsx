import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LoginPage = () => {
    const { login } = useAuth();
    const navigate  = useNavigate();

    const handleLogin = () => {
        login();
        navigate('/admin');
    };

    return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Acceso Administrador</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogin} className="w-full">
            Iniciar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
