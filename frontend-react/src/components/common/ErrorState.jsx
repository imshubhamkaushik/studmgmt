import { AlertTriangle } from "lucide-react";

export default function ErrorState({
  title = "Something went wrong",
  message = "We could not load this data.",
  onRetry,
}) {
  return (
    <div className="error-state" role="alert">
      <span className="state-icon">
        <AlertTriangle size={24} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="button button-primary" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
