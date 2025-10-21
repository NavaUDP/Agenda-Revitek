// client/src/context/AuthProvider.tsx

import { createContext, useState, ReactNode, useEffect, useContext } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

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
    role: 'admin' | 'client';
}

// Actualizamos el tipo del Contexto
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean; // Un booleano simple para rutas protegidas
    loading: boolean;         // Para mostrar un spinner mientras se loguea
    error: string | null;     // Para mostrar errores de login
    login: (email: string, password: string) => Promise<void>; // Ahora es asíncrono
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

// --- 2. El Provider actualizado ---
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true); // Inicia en true para chequear sesión
    const [error, setError] = useState<string | null>(null);

    // Esta función configura el estado de la app a partir de un token
    const setAuthState = (accessToken: string) => {
        try {
            // 1. Guardar el token para futuras peticiones
            localStorage.setItem('access_token', accessToken);

            // 2. Configurar axios para que envíe este token en TODAS las peticiones
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

            // 3. Decodificar el token para obtener los datos del usuario
            const decodedToken = jwtDecode<JwtPayload>(accessToken);

            // 4. Guardar los datos del usuario en el estado
            setUser({
                id: decodedToken.user_id,
                nombre: decodedToken.nombre,
                email: decodedToken.email,
                role: decodedToken.is_staff ? 'admin' : 'client',
            });
            setError(null);
        } catch (e) {
            console.error("Token inválido", e);
            logout(); // Si el token es malo, limpiamos todo
        }
    };

    // EFECTO DE ARRANQUE: Chequea si ya existe un token en localStorage (persistencia)
    useEffect(() => {
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
            // Validar si el token ha expirado
            try {
                const decoded = jwtDecode<JwtPayload>(accessToken);
                if (decoded.exp * 1000 > Date.now()) {
                    setAuthState(accessToken); // El token es válido, configuramos la sesión
                } else {
                    logout(); // El token expiró
                }
            } catch (e) {
                logout(); // El token está malformado
            }
        }
        setLoading(false); // Terminamos de cargar la sesión
    }, []); // El array vacío [] asegura que esto solo se ejecute UNA VEZ al cargar la app

    // --- 3. Función de LOGIN (Llama a tu API de Django) ---
    const login = async (email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
            // Llama al endpoint de token de Django
            const response = await axios.post('http://127.0.0.1:8000/api/auth/token/', {
                email,
                password,
            });

            const { access, refresh } = response.data;

            // Guardamos el token de refresco (para el futuro)
            localStorage.setItem('refresh_token', refresh);

            // Usamos nuestra función helper para configurar el resto
            setAuthState(access);

        } catch (err: any) {
            console.error("Error de login:", err);
            let errorMessage = "Error al iniciar sesión. Intente de nuevo.";

            // Error específico de credenciales incorrectas
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                errorMessage = "Credenciales incorrectas. Verifique su email y contraseña.";
            }
            setError(errorMessage);
            throw new Error(errorMessage); // Lanza el error para que el formulario de Login lo atrape
        } finally {
            setLoading(false);
        }
    };

    // --- 4. Función de LOGOUT ---
    const logout = () => {
        setUser(null);

        // Limpia los tokens de localStorage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');

        // Limpia la cabecera de axios
        delete axios.defaults.headers.common['Authorization'];
    };

    // --- 5. El valor que proveemos al resto de la app ---
    const isAuthenticated = !!user; // true si 'user' no es null

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, error, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// --- 6. (Opcional) Un Hook personalizado para usar el contexto fácilmente ---
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
}