export const escapeCsv = (value) => {
  const text =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value ?? "");
  return /[",\n\r]/.test(text) 
    ? `"${text.replaceAll('"', '""')}"` 
    : text;
};

// Minimal RFC-4180 style parser: handles quoted fields, escaped quotes ("")
// and line breaks inside quoted fields. Returns an array of rows (arrays of
// trimmed strings). Blank lines are skipped, and a leading UTF-8 BOM (which
// Excel adds) is stripped.
export const parseCsv = (input) => {
  const text = String(input ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  const endField = () => {
    row.push(field.trim());
    field = "";
  };
  const endRow = () => {
    endField();
    if (row.some((value) => value !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") endField();
    else if (ch === "\n") endRow();
    else if (ch !== "\r") field += ch;
  }
  endField();
  if (row.some((value) => value !== "")) rows.push(row);

  return rows;
};
