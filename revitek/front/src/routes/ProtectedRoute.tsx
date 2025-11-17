import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const location = useLocation();

    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div>Cargando...</div>
            </div>
        );
    }

    if (!isAuthenticated){
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
}