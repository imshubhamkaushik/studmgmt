import { useNavigate } from "react-router-dom";

import { useCreateStudent } from "../hooks/useStudents";

import StudentForm from "../components/students/StudentForm";
import InlineError from "../components/common/InlineError";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

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

      navigate(`/students/${student._id}`, { replace: true });
    } catch (error) {
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
          <InlineError
            title="Unable to create student"
            message={getApiErrorMessage(
              createMutation.error,
              "Please check the information and try again.",
            )}
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
