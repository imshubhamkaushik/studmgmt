import { Link, useParams } from "react-router-dom";

import { useStudent } from "../hooks/useStudents";

import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";

import { formatDate, formatDateOnly } from "../utils/date";
import { isValidObjectId } from "../utils/objectId";

export default function StudentDetailsPage() {
  const { id } = useParams();
  const validId = isValidObjectId(id);
  const { data, isLoading, isError, error, refetch } = useStudent(id);

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

  const student = data?.data;

  if (!student) {
    return (
      <ErrorState
        title="Student not found"
        message="The requested student record does not exist."
      />
    );
  }

  return (
    <div className="student-details-page">
      <section className="details-card">
        <div className="details-header">
          <div>
            <span className="details-student-id">{student.studentId}</span>

            <h2>{student.name}</h2>

            <p>Student record details</p>
          </div>

          <Link
            to={`/students/${student._id}/edit`}
            className="button button-primary"
          >
            Edit Student
          </Link>
        </div>

        <dl className="details-grid">
          <div className="detail-item">
            <dt>Student ID</dt>
            <dd>{student.studentId}</dd>
          </div>

          <div className="detail-item">
            <dt>Full Name</dt>
            <dd>{student.name}</dd>
          </div>

          <div className="detail-item">
            <dt>Roll Number</dt>
            <dd>{student.rollNo}</dd>
          </div>

          <div className="detail-item">
            <dt>Class</dt>
            <dd>{student.class}</dd>
          </div>

          <div className="detail-item">
            <dt>Section</dt>
            <dd>{student.section}</dd>
          </div>

          <div className="detail-item">
            <dt>Date of Birth</dt>
            <dd>{formatDateOnly(student.dob)}</dd>
          </div>

          <div className="detail-item">
            <dt>Record Created</dt>
            <dd>{formatDate(student.createdAt)}</dd>
          </div>

          <div className="detail-item">
            <dt>Last Updated</dt>
            <dd>{formatDate(student.updatedAt)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
