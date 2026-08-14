import { useRef, useState } from "react";
import { exportStudents } from "../../api/students";
import { useImportStudents } from "../../hooks/useStudents";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";

const parseCsvLine = (line) => {
  const values = []; let current = ""; let quoted = false;
  for (let i = 0; i < line.length; i += 1) { const ch = line[i]; if (ch === '"') { if (quoted && line[i + 1] === '"') { current += '"'; i += 1; } else quoted = !quoted; } else if (ch === "," && !quoted) { values.push(current.trim()); current = ""; } else current += ch; }
  values.push(current.trim()); return values;
};
const normalizeHeader = (value) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

export default function StudentImportExport({ filters }) {
  const inputRef = useRef(null); const [error, setError] = useState(null); const [message, setMessage] = useState(null);
  const importMutation = useImportStudents();
  const handleExport = async () => { setError(null); try { const blob = await exportStudents({ search: filters.search || undefined, class: filters.className || undefined, section: filters.section || undefined, status: filters.status || undefined }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); } catch (err) { setError(getApiErrorMessage(err, "Unable to export students.")); } };
  const handleFile = async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; setError(null); setMessage(null); try { const text = await file.text(); const lines = text.split(/\r?\n/).filter((line) => line.trim()); if (lines.length < 2) throw new Error("CSV must contain a header and at least one student."); const headers = parseCsvLine(lines[0]).map(normalizeHeader); const required = ["name", "class", "section", "rollno", "dob"]; if (!required.every((field) => headers.includes(field))) throw new Error("CSV must include Name, Class, Section, Roll No and Date of Birth columns."); const rows = lines.slice(1).map((line) => { const values = parseCsvLine(line); const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])); return { name: record.name, class: record.class, section: record.section, rollNo: record.rollno, dob: record.dob, status: record.status || "active" }; }); const result = await importMutation.mutateAsync(rows); setMessage(result.message); } catch (err) { setError(err?.message || getApiErrorMessage(err, "Unable to import students.")); } };
  return <div className="import-export-actions"><button type="button" className="button button-secondary" onClick={handleExport}>Export CSV</button><button type="button" className="button button-secondary" disabled={importMutation.isPending} onClick={() => inputRef.current?.click()}>{importMutation.isPending ? "Importing..." : "Import CSV"}</button><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />{message && <span className="import-success">{message}</span>}{error && <span className="field-error">{error}</span>}</div>;
}
