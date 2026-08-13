import { Link } from "react-router-dom";

import { useDashboardStats } from "../hooks/useDashboard";

import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";

import { formatDate } from "../utils/date";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardStats();

  if (isLoading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (isError) {
    return (
      <ErrorState
        message={getApiErrorMessage(error, "Unable to load dashboard data.")}
        onRetry={refetch}
      />
    );
  }

  const stats = data?.data;

  return (
    <div className="dashboard-page">
      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-card-label">Total Students</span>

          <strong className="stat-card-value">
            {stats?.totalStudents ?? 0}
          </strong>

          <span className="stat-card-description">
            Students currently in the system
          </span>
        </article>

        <article className="stat-card">
          <span className="stat-card-label">Classes</span>

          <strong className="stat-card-value">
            {stats?.studentsByClass?.length ?? 0}
          </strong>

          <span className="stat-card-description">
            Distinct classes represented
          </span>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <div className="section-heading">
            <div>
              <h2>Students by Class</h2>
              <p>Distribution of student records.</p>
            </div>
          </div>

          {stats?.studentsByClass?.length > 0 ? (
            <div className="class-list">
              {stats.studentsByClass.map((item) => (
                <div key={item.class} className="class-list-item">
                  <span>Class {item.class}</span>

                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No student data yet"
              message="Add your first student to see class distribution."
              action={
                <Link to="/students/new" className="button button-primary">
                  Add Student
                </Link>
              }
            />
          )}
        </article>

        <article className="dashboard-card">
          <div className="section-heading">
            <div>
              <h2>Recently Added</h2>
              <p>Latest student records.</p>
            </div>

            <Link to="/students" className="text-link">
              View all
            </Link>
          </div>

          {stats?.recentStudents?.length > 0 ? (
            <div className="recent-students-list">
              {stats.recentStudents.map((student) => (
                <Link
                  key={student._id}
                  to={`/students/${student._id}`}
                  className="recent-student-item"
                >
                  <div>
                    <strong>{student.name}</strong>

                    <span>
                      {student.studentId} · Class {student.class}
                    </span>
                  </div>

                  <time>{formatDate(student.createdAt)}</time>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No recent students"
              message="Student records will appear here after they are added."
            />
          )}
        </article>
      </section>
    </div>
  );
}
