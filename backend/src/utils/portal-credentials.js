// Default portal credentials, exactly as specified: a student's default
// password is their student ID plus their date of birth; a guardian's
// account is the same student ID with a "-parent" suffix on both the
// username and the password. These are intentionally memorable defaults a
// family can use immediately — changing them afterward is the account
// holder's own choice, not something the system forces (see
// portal-auth.service.js: there is no forced-reset flow, only a
// non-blocking reminder while passwordChangedAt is still unset).

function dobStamp(dob) {
  return new Date(dob).toISOString().slice(0, 10).replaceAll("-", ""); // YYYYMMDD
}

export function studentDefaultPassword(studentId, dob) {
  return `${studentId}${dobStamp(dob)}`;
}

export function guardianUsername(studentId) {
  return `${studentId}-parent`;
}

export function guardianDefaultPassword(studentId, dob) {
  return `${studentId}${dobStamp(dob)}parent`;
}

// Splits a submitted portal username into its actor type and the student
// ID it refers to. "STU-000009" logs in as the student; "STU-000009-parent"
// logs in as that student's guardian.
export function parsePortalUsername(rawUsername) {
  const username = String(rawUsername || "").trim();
  if (username.toLowerCase().endsWith("-parent")) {
    return { type: "guardian", studentId: username.slice(0, -"-parent".length) };
  }
  return { type: "student", studentId: username };
}
