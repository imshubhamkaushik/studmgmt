export default function ErrorState({
  title = "Something went wrong",
  message = "We could not load this data.",
  onRetry,
}) {
  return (
    <div className="error-state" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>

      {onRetry && (
        <button
          type="button"
          className="button button-primary"
          onClick={onRetry}
        >
          Try Again
        </button>
      )}
    </div>
  );
}
