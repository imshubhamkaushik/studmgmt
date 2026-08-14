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

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/students" element={<StudentsPage />} />

        <Route path="/attendance" element={<AttendancePage />} />

        <Route path="/academic-years" element={<AcademicYearsPage />} />

        <Route path="/classrooms" element={<ClassroomsPage />} />

        <Route path="/students/new" element={<AddStudentPage />} />

        <Route path="/students/:id" element={<StudentDetailsPage />} />

        <Route path="/students/:id/edit" element={<EditStudentPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
