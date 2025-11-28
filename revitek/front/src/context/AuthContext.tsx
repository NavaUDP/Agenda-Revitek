// client/src/context/AuthProvider.tsx

import { createContext, useState, ReactNode, useEffect, useContext } from 'react';
import axios from 'axios';
import http from '../api/http';
import { jwtDecode } from 'jwt-decode';
import { toast } from "sonner";

// --- 1. Definimos los nuevos tipos ---

// Esto debe coincidir con el payload (datos) que pusiste en tu token en Django
type JwtPayload = {
  user_id: number;
  nombre: string;
  email: string;
  is_staff: boolean;
  exp: number; // Timestamp de expiración
}

// Este será el objeto 'user' que usará tu app
type User = {
  id: number;
  nombre: string;
  email: string;
  is_staff: boolean;
}

// Actualizamos el tipo del Contexto
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean; // <-- 3. Este estado ahora es para la carga inicial
}

export const AuthContext = createContext<AuthContextType | null>(null);

// --- 2. El Provider actualizado ---
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // --- 2. Cambiar isLoading a 'true' por defecto ---
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // --- 4. Añadir este useEffect para hidratar el estado ---
  useEffect(() => {
    // Esta función se ejecuta solo una vez cuando la app carga
    try {
      const storedAccess = localStorage.getItem('access_token');
      const storedRefresh = localStorage.getItem('refresh_token');
      const storedUser = localStorage.getItem('user');

      if (storedAccess) {
        setAccessToken(storedAccess);
      }
      if (storedRefresh) {
        setRefreshToken(storedRefresh);
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error al leer localStorage", error);
    } finally {
      // (Importante) Hemos terminado de cargar, 
      // sepamos o no si los tokens son válidos.
      setIsLoading(false);
    }
  }, []); // El array vacío asegura que se ejecute solo al montar

  const isAuthenticated = !!accessToken;

  const login = async (email: string, password: string) => {
    // --- 5. Quitar setIsLoading(true) de aquí ---
    // setIsLoading(true); // (Ya no se necesita para la acción de login)
    try {
      const { data } = await http.post('/api/auth/token/', { email, password });
      setAccessToken(data.access);
      setRefreshToken(data.refresh);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      // Decodificar el JWT para obtener la información del usuario
      const decoded: any = jwtDecode(data.access);
      const userData: User = {
        id: decoded.user_id,
        nombre: decoded.nombre,
        email: decoded.email,
        is_staff: decoded.is_staff,
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      toast.success(`Bienvenido, ${userData.nombre}`);
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error('Error al iniciar sesión. Verifica tus credenciales.');
      throw error;
    } finally {
      // --- 6. Quitar setIsLoading(false) de aquí ---
      // setIsLoading(false);
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