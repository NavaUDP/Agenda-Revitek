import { createContext, useState, useEffect, useContext } from 'react';
import http from '../api/http';
import { jwtDecode } from 'jwt-decode';
import { toast } from "sonner";

// Define the JWT Payload structure
interface JwtPayload {
  user_id: number;
  nombre: string;
  email: string;
  is_staff: boolean;
  professional_id?: number;
  exp?: number;
}

// User object used in the app
export interface User {
  id: number;
  nombre: string;
  email: string;
  is_staff: boolean;
  professional_id?: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hydrate state from localStorage on mount
  useEffect(() => {
    try {
      const storedAccess = localStorage.getItem('access_token');
      const storedRefresh = localStorage.getItem('refresh_token');
      const storedUser = localStorage.getItem('user');

      if (storedAccess) setAccessToken(storedAccess);
      if (storedRefresh) setRefreshToken(storedRefresh);
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error("Error reading from localStorage", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isAuthenticated = !!accessToken;

  const login = async (email: string, password: string) => {
    try {
      const { data } = await http.post('/api/auth/token/', { email, password });

      const newAccessToken = data.access;
      const newRefreshToken = data.refresh;

      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      localStorage.setItem('access_token', newAccessToken);
      localStorage.setItem('refresh_token', newRefreshToken);

      const decoded = jwtDecode<JwtPayload>(newAccessToken);

      const userData: User = {
        id: decoded.user_id,
        nombre: decoded.nombre,
        email: decoded.email,
        is_staff: decoded.is_staff,
        professional_id: decoded.professional_id,
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      toast.success(`Bienvenido, ${userData.nombre}`);
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error('Error al iniciar sesión. Verifica tus credenciales.');
      throw error;
    }
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, accessToken, refreshToken, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};