import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useStudent, useUpdateStudent } from "../hooks/useStudents";

import StudentForm from "../components/students/StudentForm";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import InlineError from "../components/common/InlineError";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

import { toDateInputValue } from "../utils/date";
import { isValidObjectId } from "../utils/objectId";

export default function EditStudentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const validId = isValidObjectId(id);

  const { data, isLoading, isError, error, refetch } = useStudent(id);

  const updateMutation = useUpdateStudent();
  const student = data?.data;

  const initialValues = useMemo(
    () => ({
      name: student?.name ?? "",
      rollNo:
        student?.rollNo !== null && student?.rollNo !== undefined
          ? String(student.rollNo)
          : "",
      class: student?.class ?? "",
      section: student?.section ?? "",
      dob: toDateInputValue(student?.dob),
    }),
    [student],
  );

  if (!validId) {
    return <ErrorState title="Invalid student ID" message="The requested student URL is invalid." />;
  }

  if (isLoading) {
    return <LoadingState message="Loading student..." />;
  }

  if (isError) {
    if (error?.status === 404) {
      return (
        <ErrorState
          title="Student not found"
          message="This student may have been deleted or does not exist."
        />
      );
    }

    return (
      <ErrorState
        title="Unable to load student"
        message={error?.message || "The student record could not be loaded."}
        onRetry={refetch}
      />
    );
  }

  if (!student) {
    return (
      <ErrorState
        title="Student not found"
        message="The requested student record does not exist."
      />
    );
  }

  const handleSubmit = async (studentData) => {
    try {
      await updateMutation.mutateAsync({
        id: student._id,
        studentData,
      });

      navigate(`/students/${student._id}`, {
        replace: true,
      });
    } catch {
      // The mutation error is displayed below.
    }
  };

  return (
    <div className="form-page">
      <section className="form-card">
        <div className="form-card-header">
          <span className="form-student-id">{student.studentId}</span>

          <h2>Edit Student</h2>

          <p>
            Update the student information below. Student ID cannot be changed.
          </p>
        </div>

        {updateMutation.isError && (
          <InlineError
            title="Unable to update student"
            message={getApiErrorMessage(
              updateMutation.error,
              "Please check the information and try again.",
            )}
          />
        )}

        <StudentForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isSubmitting={updateMutation.isPending}
          submitLabel="Save Changes"
        />
      </section>
    </div>
  );
}
