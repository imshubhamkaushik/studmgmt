import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";

import StudentsPage from "./pages/StudentsPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Route-level code splitting: everything below is fetched only when a
// user actually navigates to it, keeping the initial bundle (login +
// students, the two most common landing screens) small. This is what
// gets each of these page chunks out of the single monolithic bundle
// Vite was warning about.
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const StudentDetailsPage = lazy(() => import("./pages/StudentDetailsPage"));
const AddStudentPage = lazy(() => import("./pages/AddStudentPage"));
const EditStudentPage = lazy(() => import("./pages/EditStudentPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const AcademicYearsPage = lazy(() => import("./pages/AcademicYearsPage"));
const ClassroomsPage = lazy(() => import("./pages/ClassroomsPage"));
const EnrollmentsPage = lazy(() => import("./pages/EnrollmentsPage"));
const PromotionPage = lazy(() => import("./pages/PromotionPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const TeacherAssignmentsPage = lazy(() => import("./pages/TeacherAssignmentsPage"));

function RouteFallback() {
  return (
    <div className="loading-state">
      <span className="loading-spinner" aria-hidden="true" />
      <p>Loading…</p>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/students" element={<StudentsPage />} />

          <Route path="/attendance" element={<AttendancePage />} />

          <Route
            path="/academic-years"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AcademicYearsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/classrooms"
            element={
              <ProtectedRoute roles={["admin"]}>
                <ClassroomsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enrollments"
            element={
              <ProtectedRoute roles={["admin", "staff"]}>
                <EnrollmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/promotions"
            element={
              <ProtectedRoute roles={["admin"]}>
                <PromotionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={["admin"]}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher-assignments"
            element={
              <ProtectedRoute roles={["admin", "staff"]}>
                <TeacherAssignmentsPage />
              </ProtectedRoute>
            }
          />

          <Route path="/students/new" element={<AddStudentPage />} />

          <Route path="/students/:id" element={<StudentDetailsPage />} />

          <Route path="/students/:id/edit" element={<EditStudentPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
