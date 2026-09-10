import { useEffect, useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { getClassrooms } from "../api/classrooms";
import { listTeacherAssignments } from "../api/teacherAssignments";
import { useNotificationsList, useCreateNotification } from "../hooks/useNotifications";
import { useAuth } from "../auth/useAuth";
import EmptyState from "../components/common/EmptyState";
import Button from "../components/common/Button";
import { useToast } from "../hooks/useToast";
import { getApiErrorMessage } from "../utils/apiErrorMessage";

const emptyForm = { title: "", body: "", level: "school", classroom: "" };

function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const { show } = useToast();

  const [classrooms, setClassrooms] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const notifications = useNotificationsList({ limit: 30 });
  const createNotification = useCreateNotification();

  useEffect(() => {
    // A teacher only ever gets to pick from classrooms they're actually
    // assigned to (the backend enforces this too — see
    // notification.controller.js — this just keeps the picker from
    // offering options that would 403 anyway).
    const request = isTeacher
      ? listTeacherAssignments({ activeOnly: "true" }).then((rows) =>
          (rows.data || rows || []).map((row) => row.classroom),
        )
      : getClassrooms({ includeInactive: "true" }).then((res) => res.data);

    request.then(setClassrooms).catch(() => {
      // Non-fatal — the classroom picker just stays empty; school-wide
      // announcements (admin/staff) still work.
    });
  }, [isTeacher]);

  async function submit(event) {
    event.preventDefault();
    const payload = {
      type: "announcement",
      title: form.title.trim(),
      body: form.body.trim(),
      scope: form.level === "classroom" ? { level: "classroom", classroom: form.classroom } : { level: "school" },
    };
    try {
      await createNotification.mutateAsync(payload);
      show("Announcement sent.", "success");
      setForm(emptyForm);
    } catch (err) {
      show(getApiErrorMessage(err, "Unable to send announcement."), "error");
    }
  }

  const items = notifications.data?.data?.items ?? [];

  return (
    <div className="page-narrow">
      <section className="form-card">
        <h2>New announcement</h2>
        <p className="muted-text">
          {isTeacher
            ? "Send an update to everyone in one of your classrooms — parents and the student both see it in the portal."
            : "Send a school-wide update, or target a single classroom."}
        </p>

        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              <span>Audience</span>
              <select value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
                {!isTeacher && <option value="school">Everyone (school-wide)</option>}
                <option value="classroom">A specific classroom</option>
              </select>
            </label>

            {form.level === "classroom" && (
              <label>
                <span>Classroom</span>
                <select
                  value={form.classroom}
                  onChange={(e) => setForm((f) => ({ ...f, classroom: e.target.value }))}
                  required
                >
                  <option value="" disabled>
                    Select a classroom
                  </option>
                  {classrooms.map((room) => (
                    <option key={room._id} value={room._id}>
                      {room.className}-{room.section}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <label>
            <span>Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={150}
              required
            />
          </label>

          <label>
            <span>Message (optional)</span>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              maxLength={1000}
              rows={3}
            />
          </label>

          <Button type="submit" loading={createNotification.isPending}>
            <Send size={15} aria-hidden="true" />
            Send announcement
          </Button>
        </form>
      </section>

      <section className="form-card">
        <h2>Recent announcements</h2>
        {notifications.isLoading && <p>Loading…</p>}
        {!notifications.isLoading && items.length === 0 && (
          <EmptyState
            icon={Megaphone}
            title="No announcements yet"
            message="Anything you send will show up here, along with what everyone else on staff has sent."
          />
        )}
        {items.length > 0 && (
          <ul className="portal-list">
            {items.map((item) => (
              <li key={item._id}>
                <div>
                  <strong>{item.title}</strong>
                  {item.body && <p className="portal-list-meta">{item.body}</p>}
                  <span className="portal-list-meta">
                    {item.scope.level === "school" ? "Everyone" : item.scope.level === "classroom" ? "Classroom" : item.scope.level}
                    {" · "}
                    {timeAgo(item.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
