import { Link } from "react-router-dom";
import { CalendarCheck, ClipboardList, GraduationCap } from "lucide-react";
import { usePortalProfile, usePortalAttendance, usePortalAssignments } from "../hooks/usePortalData";
import { usePortalAuth } from "../auth/usePortalAuth";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function PortalDashboardPage() {
  const { user } = usePortalAuth();
  const profile = usePortalProfile();
  const attendance = usePortalAttendance();
  const assignments = usePortalAssignments();

  const enrollment = profile.data?.currentEnrollment;
  const attendanceSummary = attendance.data?.summary ?? {};
  const attendanceTotal = attendance.data?.total ?? 0;
  const presentCount = attendanceSummary.present ?? 0;
  const attendanceRate = attendanceTotal ? Math.round((presentCount / attendanceTotal) * 100) : null;

  const upcoming = (assignments.data ?? [])
    .filter((a) => !a.submission && new Date(a.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  return (
    <div className="portal-page">
      <div className="page-heading">
        <p className="eyebrow">Welcome back</p>
        <h1>{user?.name}</h1>
        {enrollment && (
          <p>
            {enrollment.classroom.className}-{enrollment.classroom.section} · Roll No.{" "}
            {enrollment.rollNo} · {enrollment.academicYear.name}
          </p>
        )}
      </div>

      {user?.usingDefaultPassword && (
        <p className="page-note">
          You're still using your default password.{" "}
          <Link to="/portal/change-password">Change it</Link> whenever you get a chance.
        </p>
      )}

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Current classroom</span>
            <span className="stat-card-icon"><GraduationCap size={16} /></span>
          </div>
          <strong className="stat-card-value">
            {enrollment ? `${enrollment.classroom.className}-${enrollment.classroom.section}` : "—"}
          </strong>
          <span className="stat-card-description">{enrollment?.academicYear.name ?? "No active enrollment"}</span>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Attendance</span>
            <span className="stat-card-icon" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
              <CalendarCheck size={16} />
            </span>
          </div>
          <strong className="stat-card-value">{attendanceRate != null ? `${attendanceRate}%` : "—"}</strong>
          <span className="stat-card-description">
            {attendanceTotal ? `Last ${attendanceTotal} recorded day(s)` : "No records yet"}
          </span>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Awaiting submission</span>
            <span className="stat-card-icon" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
              <ClipboardList size={16} />
            </span>
          </div>
          <strong className="stat-card-value">{upcoming.length}</strong>
          <span className="stat-card-description">Assignments due soon</span>
        </article>
      </section>

      <section className="form-card">
        <h2>Upcoming assignments</h2>
        {assignments.isLoading && <p>Loading…</p>}
        {!assignments.isLoading && upcoming.length === 0 && (
          <p className="notification-empty">Nothing due right now — you're all caught up.</p>
        )}
        {upcoming.length > 0 && (
          <ul className="portal-list">
            {upcoming.map((a) => (
              <li key={a._id}>
                <div>
                  <strong>{a.title}</strong>
                  <span className="portal-list-meta">{a.subject?.name} · Due {formatDate(a.dueDate)}</span>
                </div>
                <Link className="button button-secondary" to="/portal/assignments">
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
