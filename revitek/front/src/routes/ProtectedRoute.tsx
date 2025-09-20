import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { user } = useAuth();

    if(!user || user.role !== 'admin'){
        return <Navigate to="/login" />;
    }

    return children;
}

export default ProtectedRoute;