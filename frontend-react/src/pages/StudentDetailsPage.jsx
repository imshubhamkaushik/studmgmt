import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useStudent } from "../hooks/useStudents";
import { getStudentAttendanceHistory } from "../api/attendance";
import { getEnrollments } from "../api/enrollments";
import { getStudentAuditHistory } from "../api/students";
import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import Avatar from "../components/common/Avatar";
import { formatDate, formatDateOnly } from "../utils/date";
import { isValidObjectId } from "../utils/objectId";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

export default function StudentDetailsPage() {
  const { id } = useParams();
  const validId = isValidObjectId(id);
  const { data, isLoading, isError, error, refetch } = useStudent(id);
  const [tab, setTab] = useState("overview");
  const [attendance, setAttendance] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [audit, setAudit] = useState([]);
  const [tabError, setTabError] = useState("");
  useEffect(() => {
    if (!validId || tab === "overview") return;
    let cancelled = false;
    const run = async () => {
      setTabError("");
      try {
        if (tab === "attendance") {
          const result = (await getStudentAttendanceHistory(id)).data;
          if (!cancelled) setAttendance(result);
        }
        if (tab === "enrollments") {
          const result = (await getEnrollments({ student: id })).data || [];
          if (!cancelled) setEnrollments(result);
        }
        if (tab === "history") {
          const result = (await getStudentAuditHistory(id)).data || [];
          if (!cancelled) setAudit(result);
        }
      } catch (e) {
        if (!cancelled)
          setTabError(getApiErrorMessage(e, "Unable to load this section."));
      }
    };
    Promise.resolve().then(run);
    return () => {
      cancelled = true;
    };
  }, [id, tab, validId]);
  if (!validId)
    return (
      <ErrorState
        title="Invalid student ID"
        message="The requested student URL is invalid."
      />
    );
  if (isLoading) return <LoadingState message="Loading student..." />;
  if (isError)
    return (
      <ErrorState
        title={
          error?.status === 404 ? "Student not found" : "Unable to load student"
        }
        message={error?.message || "The student record could not be loaded."}
        onRetry={refetch}
      />
    );
  const student = data?.data;
  if (!student)
    return (
      <ErrorState
        title="Student not found"
        message="The requested student record does not exist."
      />
    );
  const status = student.status || "unknown";
  return (
    <div className="student-details-page">
      <section className="details-card">
        <div className="details-header">
          <div className="details-header-main">
            <Avatar name={student.name} size="lg" />
            <div>
              <span className="details-student-id">{student.studentId}</span>
              <h2>{student.name}</h2>
              <p>
                <span className={`status-badge status-${status}`}>
                  <span className="status-badge-dot" aria-hidden="true" />
                  {status}
                </span>{" "}
                Student record
              </p>
            </div>
          </div>
          <Link
            to={`/students/${student._id}/edit`}
            className="button button-primary"
          >
            Edit Student
          </Link>
        </div>
        <div className="profile-tabs">
          <button
            type="button"
            className={tab === "overview" ? "active" : ""}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={tab === "attendance" ? "active" : ""}
            onClick={() => setTab("attendance")}
          >
            Attendance
          </button>
          <button
            type="button"
            className={tab === "enrollments" ? "active" : ""}
            onClick={() => setTab("enrollments")}
          >
            Enrollment
          </button>
          <button
            type="button"
            className={tab === "history" ? "active" : ""}
            onClick={() => setTab("history")}
          >
            History
          </button>
        </div>
        {tabError && <div className="inline-error">{tabError}</div>}
        {tab === "overview" && (
          <dl className="details-grid">
            <div className="detail-item">
              <dt>Student ID</dt>
              <dd>{student.studentId}</dd>
            </div>
            <div className="detail-item">
              <dt>Admission Number</dt>
              <dd>{student.admissionNo || "—"}</dd>
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
        )}
        {tab === "attendance" && (
          <div className="profile-panel">
            <h3>Attendance summary</h3>
            {attendance ? (
              <>
                <div className="summary-grid">
                  <div>
                    <strong>
                      {attendance.total ?? attendance.summary?.total ?? 0}
                    </strong>
                    <span>Total</span>
                  </div>
                  <div>
                    <strong>
                      {attendance.present ?? attendance.summary?.present ?? 0}
                    </strong>
                    <span>Present</span>
                  </div>
                  <div>
                    <strong>
                      {attendance.absent ?? attendance.summary?.absent ?? 0}
                    </strong>
                    <span>Absent</span>
                  </div>
                  <div>
                    <strong>
                      {attendance.attendancePercentage ??
                        attendance.summary?.attendancePercentage ??
                        0}
                      %
                    </strong>
                    <span>Attendance</span>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(attendance.records || attendance.data || []).map(
                        (r, i) => (
                          <tr key={r._id || i}>
                            <td>{formatDateOnly(r.date)}</td>
                            <td>{r.status}</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <LoadingState message="Loading attendance..." />
            )}
          </div>
        )}
        {tab === "enrollments" && (
          <div className="profile-panel">
            <h3>Academic placement history</h3>
            {enrollments.length ? (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Academic Year</th>
                      <th>Classroom</th>
                      <th>Roll</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e) => (
                      <tr key={e._id}>
                        <td>{e.academicYear?.name || "—"}</td>
                        <td>
                          {e.classroom
                            ? `${e.classroom.className}-${e.classroom.section}`
                            : "—"}
                        </td>
                        <td>{e.rollNo}</td>
                        <td>{e.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No enrollment history found.</p>
            )}
          </div>
        )}
        {tab === "history" && (
          <div className="profile-panel">
            <h3>Activity history</h3>
            {audit.length ? (
              audit.map((item, i) => (
                <div className="timeline-item" key={item._id || i}>
                  <strong>{item.action}</strong>
                  <span>{formatDate(item.createdAt)}</span>
                  <p>
                    {item.changes?.after?.name ||
                      item.changes?.status ||
                      item.changes?.toAcademicYearId ||
                      "Record changed"}
                  </p>
                </div>
              ))
            ) : (
              <p>No activity history found.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
