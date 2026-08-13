import { useNavigate } from "react-router-dom";

import { useCreateStudent } from "../hooks/useStudents";

import StudentForm from "../components/students/StudentForm";
import ErrorState from "../components/common/ErrorState";

export default function AddStudentPage() {
  const navigate = useNavigate();

  const createMutation = useCreateStudent();

  const handleSubmit = async (studentData) => {
    try {
      const response = await createMutation.mutateAsync(studentData);

      const student = response?.data;

      if (!student?._id) {
        throw new Error(
          "Student was created, but the server returned an invalid response.",
        );
      }

      navigate(`/students/${student._id}`, {
        replace: true,
      });
    } catch {
      console.error("Create student failed:", error);
    }
  };

  return (
    <div className="form-page">
      <section className="form-card">
        <div className="form-card-header">
          <h2>Student Information</h2>

          <p>
            Enter the student details below. The Student ID will be generated
            automatically.
          </p>
        </div>

        {createMutation.isError && (
          <ErrorState
            title="Unable to create student"
            message={
              createMutation.error?.message ||
              "Please check the information and try again."
            }
          />
        )}

        <StudentForm
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
          submitLabel="Create Student"
        />
      </section>
    </div>
  );
}
