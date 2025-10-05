import { createContext, useState, ReactNode } from 'react';

type User = {
    role: 'admin' | 'client';
}

interface AuthContextType {
    user: User | null;
    login: (role: 'admin' | 'client') => void;
    logout:() => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // CAMBIO: El estado inicial ahora es 'null' (nadie ha iniciado sesión)
    const [user, setUser] = useState<User | null>(null);

    const login = (role: 'admin' | 'client') => {
        // En un futuro, aquí llamarías a tu API de Django, que te devolvería el rol del usuario
        setUser({ role });
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}