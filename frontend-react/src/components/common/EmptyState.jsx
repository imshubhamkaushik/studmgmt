export default function EmptyState({
  title = "Nothing to display",
  message = "There is currently no data available.",
  action,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <h2>{title}</h2>
        <p>{message}</p>

        {action}
      </div>
    </div>
  );
}
