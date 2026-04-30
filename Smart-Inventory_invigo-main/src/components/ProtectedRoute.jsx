import { Navigate } from "react-router-dom";
import { isLoggedIn, hasRole } from "@/lib/auth";

const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!isLoggedIn()) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        if (!hasRole(...allowedRoles)) {
            return <Navigate to="/login" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
