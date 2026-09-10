import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../db/dynamo-client.js";
import { listStudentsByClassSection, getStudentById } from "./student.repository.js";

const ATTENDANCE_TABLE = "Attendance";
export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"];

// PK(studentId) + SK(date) already IS the unique(student,date) constraint
// -- unlike Students, no transaction / UniqueConstraints entry is needed
// here. A repeated Put for the same key just overwrites, which is
// exactly the upsert-on-resave behaviour the real app documents.
function toItem({ studentId, classValue, section, date, status }) {
  return {
    studentId,
    date, // "YYYY-MM-DD"
    classSection: `${classValue}#${section}`,
    dateStudentId: `${date}#${studentId}`, // GSI1 sort key
    status,
    markedAt: new Date().toISOString(),
  };
}

// --- bulk mark, mirrors markBulkAttendance() ----------------------------
// Real service: validates every record belongs to an active, non-deleted
// student in the given class+section BEFORE writing anything, then
// upserts each record. Reusing listStudentsByClassSection() here means
// this validation rule lives in exactly one place, not duplicated.
export async function markBulkAttendance({ className, section, date, records }) {
  const activeStudents = await listStudentsByClassSection(className, section, {
    status: "active",
  });
  const activeIds = new Set(activeStudents.map((s) => s.studentId));

  const invalid = records.filter((r) => !activeIds.has(r.studentId));
  if (invalid.length > 0) {
    throw new Error(
      "All attendance records must belong to active, non-archived students in the selected class and section.",
    );
  }

  const items = records.map((r) =>
    toItem({
      studentId: r.studentId,
      classValue: className,
      section,
      date,
      status: r.status,
    }),
  );

  // DynamoDB has no bulk "upsert with per-item duplicate detection" the
  // way Mongo's bulkWrite result does, so matched/created/updated counts
  // aren't distinguishable here without an extra read first. For a
  // portfolio project this simplification is a reasonable, documented
  // trade-off -- note it in ARCHITECTURE.md if asked in an interview.
  await Promise.all(
    items.map((item) =>
      ddb.send(new PutCommand({ TableName: ATTENDANCE_TABLE, Item: item })),
    ),
  );

  return {
    date,
    class: className,
    section,
    total: records.length,
  };
}

// --- single student, date range, mirrors getStudentAttendanceHistory() --
export async function getStudentAttendanceHistory(studentId, { from, to } = {}) {
  const student = await getStudentById(studentId);
  if (!student || student.isDeleted) throw new Error("Student not found.");

  const keyCondition = ["studentId = :sid"];
  const values = { ":sid": studentId };

  if (from && to) {
    keyCondition.push("#date BETWEEN :from AND :to");
    values[":from"] = from;
    values[":to"] = to;
  } else if (from) {
    keyCondition.push("#date >= :from");
    values[":from"] = from;
  } else if (to) {
    keyCondition.push("#date <= :to");
    values[":to"] = to;
  }

  const result = await ddb.send(
    new QueryCommand({
      TableName: ATTENDANCE_TABLE,
      KeyConditionExpression: keyCondition.join(" AND "),
      ExpressionAttributeNames: { "#date": "date" },
      ExpressionAttributeValues: values,
      ScanIndexForward: false, // newest date first, matches .sort({date:-1})
    }),
  );

  return {
    student: {
      studentId: student.studentId,
      name: student.name,
    },
    records: result.Items,
    summary: summarize(result.Items),
  };
}

// --- class/section, date range, mirrors getAttendanceSummary() ----------
export async function getAttendanceSummaryByClassSection(
  classValue,
  section,
  { from, to } = {},
) {
  const classSection = `${classValue}#${section}`;
  const values = { ":cs": classSection };
  let sortKeyCondition = "";

  if (from && to) {
    sortKeyCondition = "AND dateStudentId BETWEEN :from AND :to";
    values[":from"] = from;
    values[":to"] = `${to}#\uffff`; // include every studentId on the 'to' date
  }

  const result = await ddb.send(
    new QueryCommand({
      TableName: ATTENDANCE_TABLE,
      IndexName: "GSI1_ByClassSection",
      KeyConditionExpression: `classSection = :cs ${sortKeyCondition}`,
      ExpressionAttributeValues: values,
    }),
  );

  return summarize(result.Items);
}

function summarize(records) {
  const counts = Object.fromEntries(ATTENDANCE_STATUSES.map((s) => [s, 0]));
  for (const r of records) counts[r.status] += 1;

  const total = records.length;
  const attended = counts.present + counts.late + counts.excused;

  return {
    total,
    ...counts,
    attendancePercentage: total ? Number(((attended / total) * 100).toFixed(2)) : 0,
  };
}
