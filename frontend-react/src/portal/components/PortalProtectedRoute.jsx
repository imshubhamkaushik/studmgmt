import { Navigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "../auth/usePortalAuth";

export default function PortalProtectedRoute({ children }) {
  const { isAuthenticated, loading } = usePortalAuth();
  const location = useLocation();

  if (loading) return <div className="page-loading">Checking session…</div>;

  if (!isAuthenticated)
    return <Navigate to="/portal/login" replace state={{ from: location.pathname }} />;

  return children;
}
