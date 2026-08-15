const PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#0d9488",
  "#db2777",
  "#ea580c",
  "#4f46e5",
];

function hashString(value) {
  let hash = 0;
  
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.codePointAt(i);
    hash = Math.trunc(hash);
  }
  
  return Math.abs(hash);
}

function initialsFor(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name = "", size = "md", className = "" }) {
  const color = PALETTE[hashString(name || "?") % PALETTE.length];
  
  return (
    <span
      className={`avatar avatar-${size} ${className}`}
      style={{ background: color }}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}
