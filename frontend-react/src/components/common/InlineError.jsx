export default function InlineError({
  title = "Something went wrong",
  message,
}) {
  return (
    <div className="inline-error" role="alert">
      <strong>{title}</strong>
      {message && <p>{message}</p>}
    </div>
  );
}
