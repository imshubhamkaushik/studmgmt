import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";

import DashboardPage from "./pages/DashboardPage";
import StudentsPage from "./pages/StudentsPage";
import StudentDetailsPage from "./pages/StudentDetailsPage";
import AddStudentPage from "./pages/AddStudentPage";
import EditStudentPage from "./pages/EditStudentPage";
import NotFoundPage from "./pages/NotFoundPage";
import AttendancePage from "./pages/AttendancePage";
import AcademicYearsPage from "./pages/AcademicYearsPage";
import ClassroomsPage from "./pages/ClassroomsPage";
import EnrollmentsPage from "./pages/EnrollmentsPage";
import PromotionPage from "./pages/PromotionPage";
import LoginPage from "./pages/LoginPage";
import UsersPage from "./pages/UsersPage";
import TeacherAssignmentsPage from "./pages/TeacherAssignmentsPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";

export default function App() {
  return (
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
            <ProtectedRoute roles={["admin"]}>
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
  );
}
