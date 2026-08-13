export default function LoadingState({ message = "Loading..." }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-spinner" />
      <span>{message}</span>
    </div>
  );
}
