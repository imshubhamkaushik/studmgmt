import { Check } from "lucide-react";
import {
  usePortalNotifications,
  useMarkPortalNotificationRead,
  useMarkAllPortalNotificationsRead,
} from "../hooks/usePortalData";

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function PortalNotificationsPage() {
  const notifications = usePortalNotifications(true);
  const markRead = useMarkPortalNotificationRead();
  const markAllRead = useMarkAllPortalNotificationsRead();
  const items = notifications.data?.items ?? [];
  const unread = items.filter((i) => !i.isRead).length;

  return (
    <div className="portal-page">
      <div className="page-heading">
        <p className="eyebrow">Stay informed</p>
        <h1>Notifications</h1>
        <p>Announcements and updates from your school.</p>
      </div>

      <section className="form-card">
        <div className="notification-panel-header" style={{ padding: 0, marginBottom: 14 }}>
          <span>{unread > 0 ? `${unread} unread` : "All caught up"}</span>
          {unread > 0 && (
            <button type="button" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              <Check size={13} aria-hidden="true" />
              Mark all read
            </button>
          )}
        </div>

        {notifications.isLoading && <p>Loading…</p>}
        {!notifications.isLoading && items.length === 0 && (
          <p className="notification-empty">Nothing here yet.</p>
        )}

        {items.length > 0 && (
          <ul className="portal-list">
            {items.map((item) => (
              <li key={item._id} className={item.isRead ? "" : "portal-notification-unread"}>
                <div>
                  <strong>{item.title}</strong>
                  {item.body && <p className="portal-list-meta">{item.body}</p>}
                  <span className="portal-list-meta">{formatDate(item.createdAt)}</span>
                </div>
                {!item.isRead && (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => markRead.mutate(item._id)}
                    disabled={markRead.isPending}
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
