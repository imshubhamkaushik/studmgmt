import { Inbox } from "lucide-react";

export default function EmptyState({
  title = "Nothing to display",
  message = "There is currently no data available.",
  action,
  icon: Icon = Inbox,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <span className="state-icon">
          <Icon size={24} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <h2>{title}</h2>
        <p>{message}</p>
        {action}
      </div>
    </div>
  );
}
