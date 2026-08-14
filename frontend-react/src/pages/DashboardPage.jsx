import { Link } from "react-router-dom";
import { useState } from "react";

import { useDashboardStats } from "../hooks/useDashboard";

import LoadingState from "../components/common/LoadingState";
import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";

import { formatDate } from "../utils/date";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

export default function DashboardPage() {
  const [range, setRange] = useState("all");
  const { data, isLoading, isError, error, refetch } = useDashboardStats(range);

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
      <div className="dashboard-range" role="group" aria-label="Dashboard date range">
        {[["all", "All Time"], ["7d", "Last 7 Days"], ["30d", "Last 30 Days"]].map(([value, label]) => (
          <button key={value} type="button" className={`button ${range === value ? "button-primary" : "button-secondary"}`} onClick={() => setRange(value)}>{label}</button>
        ))}
      </div>
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
          <span className="stat-card-label">Active Students</span>
          <strong className="stat-card-value">{stats?.activeStudents ?? 0}</strong>
          <span className="stat-card-description">Currently active student records</span>
        </article>

        <article className="stat-card">
          <span className="stat-card-label">Today&apos;s Attendance</span>
          <strong className="stat-card-value">{stats?.todayAttendance?.percentage ?? 0}%</strong>
          <span className="stat-card-description">{stats?.todayAttendance?.present ?? 0} present · {stats?.todayAttendance?.absent ?? 0} absent</span>
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
                      {student.studentId} · Class {student.class}-{student.section} · {student.status ?? "active"}
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

      <section className="dashboard-card recently-updated-card">
        <div className="section-heading"><div><h2>Recently Updated</h2><p>Latest changes to student records.</p></div></div>
        {stats?.recentlyUpdated?.length > 0 ? <div className="recent-students-list">
          {stats.recentlyUpdated.map((student) => <Link key={student._id} to={`/students/${student._id}`} className="recent-student-item">
            <div><strong>{student.name}</strong><span>{student.studentId} · Class {student.class}-{student.section} · {student.status ?? "active"}</span></div>
            <time>{formatDate(student.updatedAt)}</time>
          </Link>)}
        </div> : <EmptyState title="No recent updates" message="Updates will appear here when student records change." />}
      </section>
    </div>
  );
}
