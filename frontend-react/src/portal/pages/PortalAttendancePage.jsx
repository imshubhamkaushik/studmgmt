import { useState } from "react";
import { usePortalAttendance } from "../hooks/usePortalData";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const STATUS_TONE = {
  present: "status-active",
  absent: "status-inactive",
  late: "status-late",
  excused: "status-badge",
};

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export default function PortalAttendancePage() {
  const [month, setMonth] = useState(currentMonthValue());
  const attendance = usePortalAttendance(month);
  const records = attendance.data?.records ?? [];
  const summary = attendance.data?.summary ?? {};

  return (
    <div className="portal-page">
      <div className="page-heading">
        <p className="eyebrow">Attendance</p>
        <h1>Attendance record</h1>
        <p>Day-by-day attendance for the selected month.</p>
      </div>

      <section className="form-card">
        <div className="attendance-controls" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <label>
            <span>Month</span>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
        </div>

        <div className="chip-row">
          {["present", "absent", "late", "excused"].map((status) =>
            summary[status] ? (
              <span key={status} className="chip">
                {summary[status]} {status}
              </span>
            ) : null,
          )}
          {Object.keys(summary).length === 0 && !attendance.isLoading && (
            <span className="chip">No records this month</span>
          )}
        </div>

        {attendance.isLoading && <p>Loading…</p>}
        {attendance.isError && (
          <div className="inline-error">{getApiErrorMessage(attendance.error, "Unable to load attendance.")}</div>
        )}

        {records.length > 0 && (
          <table className="student-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  <td>{formatDate(r.date)}</td>
                  <td>
                    <span className={`status-badge ${STATUS_TONE[r.status] || ""}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
