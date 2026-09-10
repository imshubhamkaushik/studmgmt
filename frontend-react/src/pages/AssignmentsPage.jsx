import { useEffect, useMemo, useState } from "react";
import { ClipboardList, PlusCircle, Users } from "lucide-react";
import { getAcademicYears } from "../api/academicYears";
import { getClassrooms } from "../api/classrooms";
import { getSubjects } from "../api/subjects";
import { useAssignments, useCreateAssignment } from "../hooks/useAssignments";
import EmptyState from "../components/common/EmptyState";
import Button from "../components/common/Button";
import SubmissionsModal from "../components/assignments/SubmissionsModal";
import { useToast } from "../hooks/useToast";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

const emptyForm = { classroom: "", subject: "", title: "", description: "", dueDate: "", maxMarks: "" };

export default function AssignmentsPage() {
  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const { show } = useToast();

  useEffect(() => {
    Promise.all([getAcademicYears(), getClassrooms({ includeInactive: "true" }), getSubjects()])
      .then(([, roomsRes, subjectsRes]) => {
        setClassrooms(roomsRes.data);
        setSubjects(subjectsRes.data);
      })
      .catch(() => {
        // Non-fatal — the create form just shows empty selects; the
        // assignment list below doesn't depend on this.
      });
  }, []);

  const assignments = useAssignments(form.classroom ? { classroom: form.classroom } : {});
  const createAssignment = useCreateAssignment();

  const items = assignments.data?.data ?? [];

  const classroomLabel = useMemo(
    () => (id) => {
      const room = classrooms.find((c) => c._id === id);
      return room ? `${room.className}${room.section ? ` - ${room.section}` : ""}` : "";
    },
    [classrooms],
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!form.classroom || !form.subject || !form.title || !form.dueDate) {
      show("Classroom, subject, title, and due date are required.", "error");
      return;
    }
    try {
      await createAssignment.mutateAsync({
        classroom: form.classroom,
        subject: form.subject,
        title: form.title,
        description: form.description,
        dueDate: form.dueDate,
        maxMarks: form.maxMarks || null,
      });
      show("Assignment created.");
      setForm((f) => ({ ...emptyForm, classroom: f.classroom }));
    } catch (err) {
      show(getApiErrorMessage(err, "Unable to create assignment."), "error");
    }
  };

  return (
    <main className="page page-narrow">
      <section className="form-card">
        <div className="section-heading">
          <div>
            <h2>
              <ClipboardList
                size={16}
                style={{ marginRight: 8, verticalAlign: -3, color: "var(--brand)" }}
                aria-hidden="true"
              />
              New Assignment
            </h2>
            <p>Due dates in the past are still accepted — submissions are simply marked late.</p>
          </div>
        </div>
        <form className="student-form" onSubmit={submit}>
          <div>
            <label className="form-field-label" htmlFor="asg-classroom">Classroom</label>
            <select
              id="asg-classroom"
              value={form.classroom}
              onChange={(e) => setForm({ ...form, classroom: e.target.value })}
            >
              <option value="">Select classroom</option>
              {classrooms.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.className} {c.section} — {c.academicYear?.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="asg-subject">Subject</label>
            <select
              id="asg-subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            >
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-field-label" htmlFor="asg-title">Title</label>
            <input
              id="asg-title"
              placeholder="e.g. Chapter 4 Problem Set"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="asg-due">Due date</label>
            <input
              id="asg-due"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="asg-marks">Max marks (optional)</label>
            <input
              id="asg-marks"
              type="number"
              min="1"
              placeholder="e.g. 100"
              value={form.maxMarks}
              onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="form-field-label" htmlFor="asg-desc">Description (optional)</label>
            <textarea
              id="asg-desc"
              rows={2}
              placeholder="Instructions for students..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="form-field-label" htmlFor="asg-submit">&nbsp;</label>
            <button id="asg-submit" type="submit" className="button button-primary" style={{ width: "100%" }} disabled={createAssignment.isPending}>
              <PlusCircle size={15} aria-hidden="true" />
              Create Assignment
            </button>
          </div>
        </form>
      </section>

      <section className="dashboard-card" style={{ marginTop: 18 }}>
        <div className="section-heading">
          <div>
            <h2>All Assignments</h2>
            <p>{items.length} assignment{items.length === 1 ? "" : "s"}.</p>
          </div>
        </div>
        {assignments.isLoading ? (
          <div className="skeleton-rows">
            {Array.from({ length: 3 }).map((_, i) => <div className="skeleton" key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No assignments yet"
            message="Create your first assignment above."
          />
        ) : (
          <div className="table-wrapper">
            <table className="student-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Classroom</th>
                  <th>Subject</th>
                  <th>Due date</th>
                  <th>Max marks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a._id}>
                    <td><strong>{a.title}</strong></td>
                    <td>{a.classroom ? `${a.classroom.className} ${a.classroom.section}` : classroomLabel(a.classroom)}</td>
                    <td>{a.subject?.name}</td>
                    <td>{new Date(a.dueDate).toLocaleDateString()}</td>
                    <td>{a.maxMarks ?? "—"}</td>
                    <td>
                      <Button variant="secondary" onClick={() => setActiveAssignment(a)}>
                        <Users size={14} aria-hidden="true" />
                        Submissions
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {activeAssignment && (
        <SubmissionsModal assignment={activeAssignment} onClose={() => setActiveAssignment(null)} />
      )}
    </main>
  );
}
