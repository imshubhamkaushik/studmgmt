import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "./portal.css";
import { PortalAuthProvider } from "./auth/PortalAuthProvider";
import PortalProtectedRoute from "./components/PortalProtectedRoute";
import PortalLoginPage from "./pages/PortalLoginPage";

const PortalLayout = lazy(() => import("./components/PortalLayout"));
const PortalDashboardPage = lazy(() => import("./pages/PortalDashboardPage"));
const PortalAssignmentsPage = lazy(() => import("./pages/PortalAssignmentsPage"));
const PortalAttendancePage = lazy(() => import("./pages/PortalAttendancePage"));
const PortalReportCardPage = lazy(() => import("./pages/PortalReportCardPage"));
const PortalNotificationsPage = lazy(() => import("./pages/PortalNotificationsPage"));
const PortalChangePasswordPage = lazy(() => import("./pages/PortalChangePasswordPage"));

function RouteFallback() {
  return (
    <div className="loading-state">
      <span className="loading-spinner" aria-hidden="true" />
      <p>Loading…</p>
    </div>
  );
}

export default function PortalApp() {
  return (
    <PortalAuthProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="login" element={<PortalLoginPage />} />
          <Route
            element={
              <PortalProtectedRoute>
                <PortalLayout />
              </PortalProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PortalDashboardPage />} />
            <Route path="assignments" element={<PortalAssignmentsPage />} />
            <Route path="attendance" element={<PortalAttendancePage />} />
            <Route path="report-card" element={<PortalReportCardPage />} />
            <Route path="notifications" element={<PortalNotificationsPage />} />
            <Route path="change-password" element={<PortalChangePasswordPage />} />
          </Route>
        </Routes>
      </Suspense>
    </PortalAuthProvider>
  );
}
