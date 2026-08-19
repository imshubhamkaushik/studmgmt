const DESCRIPTIONS = {
  "student:CREATE": "added a new student",
  "student:UPDATE": "updated a student record",
  "student:ARCHIVE": "archived a student",
  "student:RESTORE": "restored a student",
  "student:BULK_STATUS_CHANGE": "updated status for multiple students",
  "attendance:BULK_MARK": "recorded attendance",
  "enrollment:CREATE": "enrolled a student",
  "enrollment:PROMOTE": "promoted students to a new academic year",
  "academicYear:CREATE": "created an academic year",
  "academicYear:UPDATE": "updated an academic year",
  "academicYear:SET_ACTIVE": "set the active academic year",
  "classroom:CREATE": "created a classroom",
  "classroom:UPDATE": "updated a classroom",
  "classroom:GENERATE_DEFAULTS": "generated default classrooms",
  "teacher_classroom_assignment:ASSIGN": "assigned a teacher to a classroom",
  "teacher_classroom_assignment:REVOKE":
    "revoked a teacher's classroom assignment",
  "user:CREATE": "added a new user account",
};

function describeUserUpdate(entry) {
  const after = entry.changes?.after || {};
  const parts = [];
  if (after.passwordReset) parts.push("reset a password");
  if (after.role) parts.push(`changed a role to ${after.role.to}`);
  if (after.isActive)
    parts.push(after.isActive.to ? "reactivated a user" : "deactivated a user");
  if (after.unlocked) parts.push("unlocked a user account");
  return parts.length > 0 ? parts.join(", ") : "updated a user account";
}

// Pulls a human name out of the audit entry's captured "changes" payload
// when one is available (student create/update entries store the full
// document), so the feed can say "added Amelia Rao" instead of a generic
// "added a new student".
export function activitySubject(entry) {
  if (entry.entityType !== "student") return null;
  return entry.changes?.after?.name || null;
}

export function describeActivity(entry) {
  if (entry.entityType === "user" && entry.action === "UPDATE") {
    return describeUserUpdate(entry);
  }
  const key = `${entry.entityType}:${entry.action}`;
  return (
    DESCRIPTIONS[key] ||
    `${entry.action.toLowerCase().replaceAll("_", " ")} on ${entry.entityType}`
  );
}
