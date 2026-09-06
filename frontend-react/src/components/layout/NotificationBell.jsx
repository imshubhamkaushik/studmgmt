import { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import {
  useUnreadNotificationCount,
  useMyNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "../../hooks/useNotifications";

function timeAgo(isoString) {
  if (!isoString) return "";
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const unreadCount = useUnreadNotificationCount();
  const notifications = useMyNotifications(open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const items = notifications.data?.data?.items ?? [];
  const count = unreadCount.data ?? 0;

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="notification-bell-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      >
        <Bell size={18} aria-hidden="true" />
        {count > 0 && <span className="notification-badge">{count > 9 ? "9+" : count}</span>}
      </button>

      {open && (
        <div className="notification-panel" role="menu">
          <div className="notification-panel-header">
            <span>Notifications</span>
            {count > 0 && (
              <button type="button" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
                <Check size={13} aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          {notifications.isLoading && <p className="notification-empty">Loading…</p>}

          {!notifications.isLoading && items.length === 0 && (
            <p className="notification-empty">You're all caught up.</p>
          )}

          <ul className="notification-list">
            {items.map((item) => (
              <li key={item._id}>
                <button
                  type="button"
                  className={item.isRead ? "notification-item" : "notification-item unread"}
                  onClick={() => !item.isRead && markRead.mutate(item._id)}
                >
                  {!item.isRead && <span className="notification-dot" aria-hidden="true" />}
                  <span className="notification-item-body">
                    <span className="notification-item-title">{item.title}</span>
                    {item.body && <span className="notification-item-text">{item.body}</span>}
                    <span className="notification-item-time">{timeAgo(item.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
