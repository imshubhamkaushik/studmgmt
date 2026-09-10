import { TimetableEntry } from "../models/timetable-entry.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { PeriodAttendance } from "../models/period-attendance.model.js";
import { AppError } from "../utils/AppError.js";
import { parseAttendanceDate } from "../validators/attendance.validator.js";
import { getAssignedClassroomIds } from "./teacher-access.service.js";
import { writeAudit } from "./audit.service.js";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

async function loadEntryWithAccessCheck(timetableEntryId, user) {
  const entry = await TimetableEntry.findById(timetableEntryId)
    .populate("classroom", "className section academicYear")
    .populate("subject", "name code")
    .lean();
  if (!entry) throw new AppError("Timetable entry not found.", 404);

  const assignedIds = await getAssignedClassroomIds(user);
  if (assignedIds !== null && !assignedIds.some((id) => String(id) === String(entry.classroom._id)))
    throw new AppError("You are not assigned to this classroom.", 403);

  return entry;
}

// A period only happens on its own recurring weekday — marking Monday's
// 1st period against a Tuesday's date would silently corrupt the record.
// This is the one check that actually makes this feature "timetable-
// aware" rather than just attendance with an extra foreign key: the date
// picked has to agree with the schedule.
function assertDateMatchesEntry(entry, date) {
  const weekday = DAY_NAMES[date.getUTCDay()];
  if (weekday !== entry.dayOfWeek)
    throw new AppError(
      `${entry.dayOfWeek[0].toUpperCase()}${entry.dayOfWeek.slice(1)}'s period can't be marked for a ${weekday}. Pick a date that falls on ${entry.dayOfWeek}.`,
      400,
    );
}

export const getPeriodRoster = async (timetableEntryId, dateStr, user) => {
  const entry = await loadEntryWithAccessCheck(timetableEntryId, user);
  const date = parseAttendanceDate(dateStr);
  assertDateMatchesEntry(entry, date);

  const enrollments = await Enrollment.find({
    classroom: entry.classroom._id,
    academicYear: entry.classroom.academicYear,
    status: "active",
  })
    .populate("student", "name studentId")
    .sort({ rollNo: 1 })
    .lean();

  const existing = await PeriodAttendance.find({ timetableEntry: timetableEntryId, date }).lean();
  const statusByStudent = new Map(existing.map((r) => [String(r.student), r.status]));

  return {
    entry: {
      _id: entry._id,
      classroom: entry.classroom,
      subject: entry.subject,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
    },
    date: date.toISOString().slice(0, 10),
    roster: enrollments.map((e) => ({
      studentId: e.student._id,
      name: e.student.name,
      studentCode: e.student.studentId,
      rollNo: e.rollNo,
      status: statusByStudent.get(String(e.student._id)) || null,
    })),
  };
};

export const bulkMarkPeriod = async (timetableEntryId, dateStr, entries, user, requestId) => {
  const entry = await loadEntryWithAccessCheck(timetableEntryId, user);
  const date = parseAttendanceDate(dateStr);
  assertDateMatchesEntry(entry, date);

  const studentIds = entries.map((e) => e.studentId);
  const validEnrollments = await Enrollment.countDocuments({
    student: { $in: studentIds },
    classroom: entry.classroom._id,
    status: "active",
  });
  if (validEnrollments !== studentIds.length)
    throw new AppError("All entries must belong to students actively enrolled in this classroom.", 400);

  const operations = entries.map((e) => ({
    updateOne: {
      filter: { timetableEntry: timetableEntryId, student: e.studentId, date },
      update: {
        $set: { status: e.status, markedBy: user.sub, markedAt: new Date() },
        $setOnInsert: { timetableEntry: timetableEntryId, student: e.studentId, date },
      },
      upsert: true,
    },
  }));
  const result = await PeriodAttendance.bulkWrite(operations, { ordered: true });

  await writeAudit({
    entityType: "periodAttendance",
    entityId: `${timetableEntryId}-${date.toISOString().slice(0, 10)}`,
    action: "BULK_MARK",
    changes: {
      classroom: `${entry.classroom.className}-${entry.classroom.section}`,
      subject: entry.subject.name,
      date: date.toISOString().slice(0, 10),
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
    },
    requestId,
  });

  return { date: date.toISOString().slice(0, 10), marked: entries.length };
};
