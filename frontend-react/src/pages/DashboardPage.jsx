import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
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
  History,
  UserPlus,
  Archive,
  ArrowLeftRight,
  CalendarRange,
  Shuffle,
  Printer,
} from "lucide-react";

import { useDashboardStats } from "../hooks/useDashboard";
import { getRecentActivity } from "../api/audit";
import { queryKeys } from "../api/queryKeys";
import { useAuth } from "../auth/useAuth";
import { describeActivity, activitySubject } from "../utils/describeActivity";

import ErrorState from "../components/common/ErrorState";
import EmptyState from "../components/common/EmptyState";

import { formatDate } from "../utils/date";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

// Active/Inactive/Graduated match the exact colors used by .status-active /
// .status-inactive / .status-graduated in components.css. Suspended and
// Transferred share a badge color with their neighbor there (a deliberate
// "red family = needs attention" / "blue family = no longer active"
// grouping for quick table scanning), but a chart needs every slice to be
// visually distinct from its neighbors, so they get their own shade here.
const STATUS_COLORS = {
  active: "#027a48",
  inactive: "#b42318",
  suspended: "#f79009",
  graduated: "#3538cd",
  transferred: "#0e7490",
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

const ACTIVITY_ICONS = {
  student: UserPlus,
  attendance: CalendarCheck,
  enrollment: ArrowLeftRight,
  academicYear: CalendarRange,
  classroom: School,
  teacher_classroom_assignment: Shuffle,
};

function ActivityFeed() {
  const { hasRole } = useAuth();
  const canView = hasRole("admin", "staff");
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.audit.recent(15),
    queryFn: () => getRecentActivity(15),
    enabled: canView,
  });

  if (!canView) return null;

  const entries = data?.data ?? [];

  const formatClassLabel = (label) => {
    if (typeof label === "string" || typeof label === "number") {
      return `Class ${label}`;
    }

    return "Class";
  };

  return (
    <article className="dashboard-card">
      <div className="section-heading">
        <div>
          <h2>Recent Activity</h2>
          <p>The latest changes across the workspace.</p>
        </div>
      </div>
      {isLoading ? (
        <div className="skeleton-rows">
          {Array.from({ length: 5 }).map((_, i) => (
            <div className="skeleton" key={i} style={{ height: 40 }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          message="Actions across the app will show up here."
        />
      ) : (
        <div className="recent-students-list">
          {entries.map((entry) => {
            const Icon = ACTIVITY_ICONS[entry.entityType] || Archive;
            const subject = activitySubject(entry);
            const description = describeActivity(entry);
            const Wrapper = entry.entityType === "student" ? Link : "div";
            const wrapperProps =
              entry.entityType === "student"
                ? { to: `/students/${entry.entityId}` }
                : { style: { cursor: "default" } };
            return (
              <Wrapper
                key={entry._id}
                className="recent-student-item"
                {...wrapperProps}
              >
                <div className="recent-student-item-main">
                  <span
                    className="stat-card-icon"
                    style={{ width: 28, height: 28 }}
                  >
                    <Icon size={14} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{entry.actorEmail || "System"}</strong>
                    <span>
                      {description}
                      {subject ? `: ${subject}` : ""}
                    </span>
                  </div>
                </div>
                <time>{formatDate(entry.createdAt)}</time>
              </Wrapper>
            );
          })}
        </div>
      )}
    </article>
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
  const statusData = (stats?.studentsByStatus ?? []).map((item) => {
    const status = item.status || item._id || "unknown";
    return {
      status,
      count: item.count,
      fill: STATUS_COLORS[status] || "#98a2b3",
    };
  });
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
      <div className="print-report-header">
        <strong>StudentHub — Dashboard Report</strong>
        <span>Generated {new Date().toLocaleString()}</span>
      </div>

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
        <button
          type="button"
          className="button button-secondary"
          onClick={() => window.print()}
          style={{ marginLeft: "auto" }}
        >
          <Printer size={14} aria-hidden="true" />
          Print Report
        </button>
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
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={3}
                      stroke="none"
                    />
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
                  labelFormatter={formatClassLabel}
                  formatter={(value) => [
                    `${value} student${value === 1 ? "" : "s"}`,
                    "",
                  ]}
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

      <ActivityFeed />
    </div>
  );
}
