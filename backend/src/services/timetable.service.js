import { TimetableEntry, TIMETABLE_DAYS } from "../models/timetable-entry.model.js";
import { Classroom } from "../models/classroom.model.js";
import { Subject } from "../models/subject.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";
import { getAssignedClassroomIds } from "./teacher-access.service.js";

export const listTimetable = async (query = {}, user = null) => {
  const filter = {};
  if (query.classroom) filter.classroom = query.classroom;
  if (query.dayOfWeek) filter.dayOfWeek = query.dayOfWeek;

  const assignedIds = await getAssignedClassroomIds(user);
  if (assignedIds !== null) {
    if (filter.classroom && !assignedIds.some((id) => String(id) === String(filter.classroom)))
      throw new AppError("You are not assigned to this classroom.", 403);
    filter.classroom = filter.classroom || { $in: assignedIds };
  }

  return TimetableEntry.find(filter)
    .populate("classroom", "className section")
    .populate("subject", "name code")
    .populate("teacher", "name email")
    .sort({ dayOfWeek: 1, startTime: 1 })
    .lean();
};

async function assertNoOverlap({ classroom, dayOfWeek, startTime, endTime, excludeId }) {
  const filter = { classroom, dayOfWeek };
  if (excludeId) filter._id = { $ne: excludeId };
  const sameDay = await TimetableEntry.find(filter).lean();
  const overlaps = sameDay.some((e) => startTime < e.endTime && endTime > e.startTime);
  if (overlaps)
    throw new AppError("This time overlaps with an existing timetable entry for this classroom.", 409);
}

export const createTimetableEntry = async (input, requestId) => {
  const { classroom, subject, teacher, dayOfWeek, startTime, endTime, room } = input;
  if (!classroom || !subject || !dayOfWeek || !startTime || !endTime)
    throw new AppError("classroom, subject, dayOfWeek, startTime, and endTime are required.", 400);
  if (!TIMETABLE_DAYS.includes(dayOfWeek))
    throw new AppError(`dayOfWeek must be one of: ${TIMETABLE_DAYS.join(", ")}.`, 400);

  const [room_, subj] = await Promise.all([Classroom.findById(classroom), Subject.findById(subject)]);
  if (!room_) throw new AppError("Classroom not found.", 404);
  if (!subj) throw new AppError("Subject not found.", 404);

  await assertNoOverlap({ classroom, dayOfWeek, startTime, endTime });

  const entry = await TimetableEntry.create({
    classroom,
    subject,
    teacher: teacher || null,
    dayOfWeek,
    startTime,
    endTime,
    room: room || "",
  });
  await writeAudit({
    entityType: "timetableEntry",
    entityId: entry._id,
    action: "CREATE",
    changes: { after: entry.toObject() },
    requestId,
  });
  return entry;
};

export const deleteTimetableEntry = async (id, requestId) => {
  const entry = await TimetableEntry.findById(id);
  if (!entry) throw new AppError("Timetable entry not found.", 404);
  await entry.deleteOne();
  await writeAudit({
    entityType: "timetableEntry",
    entityId: entry._id,
    action: "DELETE",
    changes: { before: entry.toObject() },
    requestId,
  });
  return { deleted: true };
};
