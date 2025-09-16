import { createContext, useState, ReactNode } from 'react';

interface AuthContextType {
    isAdmin: boolean;
    login: () => void;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children}: {children: ReactNode}) => {
    const [isAdmin, setIsAdmin] = useState(false);

    //login
    const login = () => {
        //LLamar api django
        setIsAdmin(true);
    };

    //logout
    const logout = () => {
        setIsAdmin(false);
    };

    return (
        <AuthContext.Provider value={{ isAdmin, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}