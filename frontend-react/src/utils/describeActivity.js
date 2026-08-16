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
  "teacher_classroom_assignment:ASSIGN": "assigned a teacher to a classroom",
  "teacher_classroom_assignment:REVOKE": "revoked a teacher's classroom assignment",
};

export function describeActivity(entry) {
  const key = `${entry.entityType}:${entry.action}`;
  return DESCRIPTIONS[key] || `${entry.action.toLowerCase().replace(/_/g, " ")} on ${entry.entityType}`;
}
