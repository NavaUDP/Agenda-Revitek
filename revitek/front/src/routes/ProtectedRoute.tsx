import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { isAdmin } = useAuth();

    if(!isAdmin) {
        return <Navigate to="/login" />
    }

    return children;
}

export default ProtectedRoute;