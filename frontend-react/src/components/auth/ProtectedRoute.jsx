import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, loading, hasRole } = useAuth();
  
  const location = useLocation();
  
  if (loading) return <div className="page-loading">Checking session…</div>;
  
  if (!isAuthenticated)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  
  if (roles && !hasRole(...roles)) return <Navigate to="/dashboard" replace />;
  
  return children;
}
