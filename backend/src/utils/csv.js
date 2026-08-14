export const escapeCsv = (value) => {
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
