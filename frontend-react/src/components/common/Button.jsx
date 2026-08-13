export default function Button({
  children,
  type = "button",
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const classes = ["button", `button-${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      {...props}
      className={classes}
      disabled={disabled || loading}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
