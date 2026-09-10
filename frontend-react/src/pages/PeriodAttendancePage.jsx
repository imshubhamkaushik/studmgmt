import { useEffect, useState } from "react";
import { CalendarClock, ClipboardList } from "lucide-react";
import { getClassrooms } from "../api/classrooms";
import { getTimetable } from "../api/timetable";
import { usePeriodRoster, useMarkPeriodAttendance } from "../hooks/usePeriodAttendance";
import EmptyState from "../components/common/EmptyState";
import { useToast } from "../hooks/useToast";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

const STATUSES = ["present", "absent", "late", "excused"];
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function dayOfWeekFor(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return DAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

export default function PeriodAttendancePage() {
  const { show } = useToast();
  const [date, setDate] = useState(today());
  const [classrooms, setClassrooms] = useState([]);
  const [classroomId, setClassroomId] = useState("");
  const [periods, setPeriods] = useState([]);
  const [timetableEntryId, setTimetableEntryId] = useState("");
  const [statuses, setStatuses] = useState({});

  useEffect(() => {
    getClassrooms()
      .then((res) => setClassrooms(res.data))
      .catch(() => setClassrooms([]));
  }, []);

  // Whenever the date or classroom changes, refresh which periods are
  // actually scheduled that day — this is the "timetable-aware" part:
  // the picker only ever offers periods that really happen on the
  // selected weekday for the selected classroom, rather than a free-text
  // period number that could be marked against the wrong day.
  const [lastClassroomId, setLastClassroomId] = useState(classroomId);
  if (classroomId !== lastClassroomId) {
    setLastClassroomId(classroomId);
    if (!classroomId) setPeriods([]);
  }

  useEffect(() => {
    if (!classroomId) return undefined;
    let cancelled = false;
    getTimetable({ classroom: classroomId, dayOfWeek: dayOfWeekFor(date) })
      .then((res) => {
        if (!cancelled) setPeriods(res.data);
      })
      .catch(() => {
        if (!cancelled) setPeriods([]);
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId, date]);

  // Reset the selected period during render (not via an effect calling
  // setState) whenever it's no longer in the freshly-loaded period list —
  // same pattern used in MarkEntryPage for the equivalent "selection no
  // longer valid" case.
  if (timetableEntryId && !periods.some((p) => p._id === timetableEntryId)) {
    setTimetableEntryId("");
  }

  const roster = usePeriodRoster(timetableEntryId, date);
  const mark = useMarkPeriodAttendance(timetableEntryId, date);
  const rosterData = roster.data?.data;

  // Prefill statuses from the roster response once, when it arrives for
  // a (period, date) pair we haven't already got local edits for.
  if (rosterData && Object.keys(statuses).length === 0 && rosterData.roster.length > 0) {
    setStatuses(
      Object.fromEntries(rosterData.roster.map((r) => [String(r.studentId), r.status || "present"])),
    );
  }

  function selectPeriod(id) {
    setTimetableEntryId(id);
    setStatuses({});
  }

  function markAll(status) {
    setStatuses((current) => Object.fromEntries(Object.keys(current).map((id) => [id, status])));
  }

  async function save() {
    if (!rosterData) return;
    try {
      await mark.mutateAsync({
        date,
        entries: rosterData.roster.map((r) => ({
          studentId: r.studentId,
          status: statuses[String(r.studentId)] || "present",
        })),
      });
      show("Period attendance saved.", "success");
    } catch (err) {
      show(getApiErrorMessage(err, "Unable to save attendance."), "error");
    }
  }

  return (
    <div className="attendance-page">
      <section className="form-card attendance-controls">
        <label>
          Date
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Classroom
          <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
            <option value="">Select classroom</option>
            {classrooms.map((room) => (
              <option key={room._id} value={room._id}>
                {room.className}-{room.section}
              </option>
            ))}
          </select>
        </label>
        <label>
          Period
          <select value={timetableEntryId} onChange={(e) => selectPeriod(e.target.value)} disabled={!classroomId}>
            <option value="">Select period</option>
            {periods.map((p) => (
              <option key={p._id} value={p._id}>
                {p.startTime}–{p.endTime} · {p.subject?.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {classroomId && periods.length === 0 && (
        <section className="dashboard-card">
          <EmptyState
            icon={CalendarClock}
            title="No periods scheduled"
            message={`This classroom has no timetable entries for ${dayOfWeekFor(date)}. Add one via the timetable API, or pick a different date.`}
          />
        </section>
      )}

      {!classroomId && (
        <section className="dashboard-card">
          <EmptyState
            icon={ClipboardList}
            title="Pick a classroom and period"
            message="Choose a date and classroom above, then pick which scheduled period you're marking."
          />
        </section>
      )}

      {timetableEntryId && roster.isLoading && (
        <section className="dashboard-card">
          <p>Loading roster…</p>
        </section>
      )}

      {timetableEntryId && roster.isError && (
        <div className="inline-error">{getApiErrorMessage(roster.error, "Unable to load this period's roster.")}</div>
      )}

      {rosterData && (
        <section className="dashboard-card attendance-list">
          <div className="section-heading">
            <div>
              <h2>
                {rosterData.entry.classroom.className}-{rosterData.entry.classroom.section} ·{" "}
                {rosterData.entry.subject.name}
              </h2>
              <p>
                {rosterData.roster.length} active students · {rosterData.date} · {rosterData.entry.startTime}–
                {rosterData.entry.endTime}
              </p>
            </div>
            <div className="attendance-bulk-actions">
              <button type="button" className="button button-small button-secondary" onClick={() => markAll("present")}>
                Mark all present
              </button>
              <button type="button" className="button button-small button-secondary" onClick={() => markAll("absent")}>
                Mark all absent
              </button>
              <button className="button button-primary" onClick={save} disabled={mark.isPending}>
                {mark.isPending ? "Saving…" : "Save Attendance"}
              </button>
            </div>
          </div>

          {rosterData.roster.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No active students"
              message="There are no active enrollments in this classroom for the current academic year."
            />
          ) : (
            <div className="attendance-table">
              {rosterData.roster.map((student) => (
                <div className="attendance-row" key={student.studentId}>
                  <div>
                    <strong>
                      {student.rollNo}. {student.name}
                    </strong>
                    <span>{student.studentCode}</span>
                  </div>
                  <select
                    value={statuses[String(student.studentId)] || "present"}
                    onChange={(e) =>
                      setStatuses((current) => ({ ...current, [String(student.studentId)]: e.target.value }))
                    }
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
