import { useRef, useState } from "react";
import { Upload, Download, FileDown, CheckCircle2, AlertCircle } from "lucide-react";
import { exportStudents } from "../../api/students";
import { useImportStudents } from "../../hooks/useStudents";
import { getApiErrorMessage } from "../../utils/apiErrorMessage";
import { useToast } from "../../hooks/useToast";

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else current += ch;
  }
  values.push(current.trim());
  return values;
};

const normalizeHeader = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const validateRows = (rows) =>
  rows.map((row, index) => {
    const errors = [];
    if (!row.name?.trim()) errors.push("Name is required");
    if (!row.class?.trim()) errors.push("Class is required");
    if (!row.section?.trim()) errors.push("Section is required");
    if (!/^\d+$/.test(String(row.rollNo).trim()))
      errors.push("Roll No must be a number");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.dob?.trim()))
      errors.push("DOB must be YYYY-MM-DD");
    return { ...row, rowNumber: index + 2, errors };
  });

const TEMPLATE_CSV =
  "Name,Class,Section,RollNo,DOB,Status\n" +
  "Amelia Rao,10,A,12,2012-05-01,active\n";

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "students-import-template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function StudentImportExport({ filters }) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState([]);
  const importMutation = useImportStudents();

  const { show } = useToast();

  const handleExport = async () => {
    setError(null);
    try {
      const blob = await exportStudents({
        search: filters.search || undefined,
        class: filters.className || undefined,
        section: filters.section || undefined,
        status: filters.status || undefined,
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      show("Student CSV exported.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to export students."));

      show(getApiErrorMessage(err, "Unable to export students."), "error");
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setError(null);

    try {
      const text = await file.text();

      const lines = text.split(/\r?\n/).filter((line) => line.trim());

      if (lines.length < 2)
        throw new Error("CSV must contain a header and at least one student.");

      const headers = parseCsvLine(lines[0]).map(normalizeHeader);

      const required = ["name", "class", "section", "rollno", "dob"];

      if (!required.every((field) => headers.includes(field)))
        throw new Error(
          "CSV must include Name, Class, Section, Roll No and Date of Birth columns.",
        );

      const rows = lines.slice(1).map((line) => {
        const values = parseCsvLine(line);
        const record = Object.fromEntries(
          headers.map((header, index) => [header, values[index] ?? ""]),
        );
        return {
          name: record.name,
          class: record.class,
          section: record.section,
          rollNo: record.rollno,
          dob: record.dob,
          status: record.status || "active",
        };
      });
      setPreview(validateRows(rows));
    } catch (err) {
      setError(err?.message || "Unable to read CSV.");
    }
  };

  const handleImport = async () => {
    const invalid = preview.filter((row) => row.errors.length);

    if (invalid.length) {
      setError(`${invalid.length} row(s) need to be fixed before import.`);
      return;
    }

    try {
      const result = await importMutation.mutateAsync(
        preview.map((row) => {
          const payload = { ...row };
          delete payload.rowNumber;
          delete payload.errors;
          return payload;
        }),
      );
      show(result.message || `${preview.length} students imported.`);
      setPreview([]);
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to import students.");
      setError(message);
      show(message, "error");
    }
  };

  const invalidCount = preview.filter((r) => r.errors.length).length;

  return (
    <div className="import-export-actions">
      <button
        type="button"
        className="button button-secondary"
        onClick={handleExport}
      >
        <Download size={14} aria-hidden="true" />
        Export CSV
      </button>
      <button
        type="button"
        className="button button-secondary"
        disabled={importMutation.isPending}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={14} aria-hidden="true" />
        Import CSV
      </button>
      <button
        type="button"
        className="button button-secondary"
        onClick={downloadTemplate}
        title="Download a sample CSV with the required columns"
      >
        <FileDown size={14} aria-hidden="true" />
        Template
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={handleFile}
      />
      {preview.length > 0 && (
        <div className="csv-preview">
          <div className="section-heading">
            <div>
              <strong>Import Preview</strong>
              <div className="csv-summary">
                <span className="status-badge status-active">
                  <span className="status-badge-dot" aria-hidden="true" />
                  {preview.length - invalidCount} ready
                </span>
                {invalidCount > 0 && (
                  <span className="status-badge status-inactive">
                    <span className="status-badge-dot" aria-hidden="true" />
                    {invalidCount} need{invalidCount === 1 ? "s" : ""} fixing
                  </span>
                )}
              </div>
            </div>
            <div>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setPreview([])}
              >
                Cancel
              </button>{" "}
              <button
                type="button"
                className="button button-primary"
                disabled={
                  importMutation.isPending ||
                  preview.some((r) => r.errors.length)
                }
                onClick={handleImport}
              >
                {importMutation.isPending ? "Importing..." : "Confirm Import"}
              </button>
            </div>
          </div>
          <div className="csv-preview-table">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Section</th>
                  <th>Roll</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 25).map((row) => (
                  <tr key={row.rowNumber} className={row.errors.length ? "csv-row-invalid" : ""}>
                    <td>{row.rowNumber}</td>
                    <td>{row.name || "—"}</td>
                    <td>{row.class || "—"}</td>
                    <td>{row.section || "—"}</td>
                    <td>{row.rollNo || "—"}</td>
                    <td className="csv-row-status">
                      {row.errors.length ? (
                        <span className="csv-row-issues">
                          <AlertCircle size={12} style={{ marginRight: 4, verticalAlign: -2 }} aria-hidden="true" />
                          {row.errors.join("; ")}
                        </span>
                      ) : (
                        <span className="csv-row-ok">
                          <CheckCircle2 size={13} aria-hidden="true" />
                          Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 25 && (
            <p>
              Showing first 25 rows. All rows will be validated before import.
            </p>
          )}
        </div>
      )}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
