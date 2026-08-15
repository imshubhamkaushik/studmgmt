import { Link } from "react-router-dom";
import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Users,
  UserCheck,
  CalendarCheck,
  School,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import { useDashboardStats } from "../hooks/useDashboard";

import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";
import Avatar from "../components/common/Avatar";

import { formatDate } from "../utils/date";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

// Mirrors the exact colors used by .status-active / .status-inactive /
// .status-graduated etc in components.css, so this chart never disagrees
// with the status badges shown everywhere else in the app.
const STATUS_COLORS = {
  active: "#027a48",
  inactive: "#b42318",
  suspended: "#b42318",
  graduated: "#3538cd",
  transferred: "#3538cd",
};

function DashboardSkeleton() {
  return (
    <div className="dashboard-page">
      <div
        className="skeleton"
        style={{ height: 38, width: 260, borderRadius: 999, marginBottom: 22 }}
      />
      <div className="skeleton-stats">
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
      <div className="skeleton-charts">
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
    </div>
  );
}

function RecentList({ students, emptyTitle, emptyMessage, dateField }) {
  if (!students?.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }
  return (
    <div className="recent-students-list">
      {students.map((student) => (
        <Link
          key={student._id}
          to={`/students/${student._id}`}
          className="recent-student-item"
        >
          <div className="recent-student-item-main">
            <Avatar name={student.name} size="sm" />
            <div>
              <strong>{student.name}</strong>
              <span>
                {student.studentId} · Class {student.class}-{student.section} ·{" "}
                {student.status ?? "active"}
              </span>
            </div>
          </div>
          <time>{formatDate(student[dateField])}</time>
        </Link>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [range, setRange] = useState("all");
  const { data, isLoading, isError, error, refetch } = useDashboardStats(range);

  if (isLoading) {
    return <DashboardSkeleton />;
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
  const statusData = (stats?.studentsByStatus ?? []).map((item) => ({
    ...item,
    color: STATUS_COLORS[item.status] || "#98a2b3",
  }));
  const totalStatusCount = statusData.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const classData = stats?.studentsByClass ?? [];
  const attendance = stats?.todayAttendance;
  const inactivePct = stats?.totalStudents
    ? Math.round(((stats.inactiveStudents ?? 0) / stats.totalStudents) * 100)
    : 0;

  return (
    <div className="dashboard-page">
      <fieldset className="dashboard-range">
        <legend className="sr-only">Dashboard date range</legend>
        {[
          ["all", "All Time"],
          ["7d", "Last 7 Days"],
          ["30d", "Last 30 Days"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`button ${range === value ? "button-primary" : "button-secondary"}`}
            onClick={() => setRange(value)}
          >
            {label}
          </button>
        ))}
      </fieldset>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Total Students</span>
            <span className="stat-card-icon">
              <Users size={16} />
            </span>
          </div>
          <strong className="stat-card-value">
            {stats?.totalStudents ?? 0}
          </strong>
          <span className="stat-card-description">
            Students currently in the system
          </span>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Active Students</span>
            <span
              className="stat-card-icon"
              style={{
                background: "var(--success-soft)",
                color: "var(--success)",
              }}
            >
              <UserCheck size={16} />
            </span>
          </div>
          <strong className="stat-card-value">
            {stats?.activeStudents ?? 0}
          </strong>
          <span className="stat-card-description">
            {inactivePct > 0 ? (
              <span className="stat-card-trend stat-card-trend-down">
                <ArrowDownRight size={13} />
                {inactivePct}%
              </span>
            ) : (
              <span className="stat-card-trend stat-card-trend-up">
                <ArrowUpRight size={13} />
                100%
              </span>
            )}
            of total students
          </span>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Today&apos;s Attendance</span>
            <span
              className="stat-card-icon"
              style={{
                background: "var(--indigo-soft)",
                color: "var(--indigo)",
              }}
            >
              <CalendarCheck size={16} />
            </span>
          </div>
          <strong className="stat-card-value">
            {attendance?.percentage ?? 0}%
          </strong>
          <span className="stat-card-description">
            {attendance?.present ?? 0} present · {attendance?.absent ?? 0}{" "}
            absent
          </span>
        </article>

        <article className="stat-card">
          <div className="stat-card-top">
            <span className="stat-card-label">Classes</span>
            <span
              className="stat-card-icon"
              style={{
                background: "var(--warning-soft)",
                color: "var(--warning)",
              }}
            >
              <School size={16} />
            </span>
          </div>
          <strong className="stat-card-value">{classData.length}</strong>
          <span className="stat-card-description">
            Distinct classes represented
          </span>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <div className="section-heading">
            <div>
              <h2>Students by Status</h2>
              <p>Live breakdown of every student record.</p>
            </div>
          </div>

          {statusData.length > 0 ? (
            <div className="chart-card-body">
              <div className="chart-donut-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.status} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} students`, name]}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid var(--line)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-donut-center">
                  <strong>{totalStatusCount}</strong>
                  <span>students</span>
                </div>
              </div>
              <div className="chart-legend">
                {statusData.map((item) => (
                  <div className="chart-legend-row" key={item.status}>
                    <span
                      className="chart-legend-dot"
                      style={{ background: item.color }}
                    />
                    <span className="chart-legend-label">{item.status}</span>
                    <strong className="chart-legend-count">{item.count}</strong>
                    <span className="chart-legend-pct">
                      {totalStatusCount
                        ? Math.round((item.count / totalStatusCount) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No student data yet"
              message="Add your first student to see the status breakdown."
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
              <h2>Students by Class</h2>
              <p>Distribution of student records.</p>
            </div>
          </div>

          {classData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={classData} barSize={24}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis
                  dataKey="class"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={{ stroke: "var(--line)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--brand-soft)" }}
                  formatter={(value) => [`${value} students`, "Class"]}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--brand)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
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
      </section>

      <section className="dashboard-grid">
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
          <RecentList
            students={stats?.recentStudents}
            emptyTitle="No recent students"
            emptyMessage="Student records will appear here after they are added."
            dateField="createdAt"
          />
        </article>

        <article className="dashboard-card">
          <div className="section-heading">
            <div>
              <h2>Recently Updated</h2>
              <p>Latest changes to student records.</p>
            </div>
          </div>
          <RecentList
            students={stats?.recentlyUpdated}
            emptyTitle="No recent updates"
            emptyMessage="Updates will appear here when student records change."
            dateField="updatedAt"
          />
        </article>
      </section>
    </div>
  );
}
