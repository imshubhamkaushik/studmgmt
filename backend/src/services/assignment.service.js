import { Assignment } from "../models/assignment.model.js";
import { Classroom } from "../models/classroom.model.js";
import { Subject } from "../models/subject.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";
import { getAssignedClassroomIds } from "./teacher-access.service.js";
import { saveBuffer, sanitizeFilename } from "../utils/file-storage.js";

async function assertClassroomAccess(classroomId, user) {
  const assignedIds = await getAssignedClassroomIds(user);
  if (assignedIds !== null && !assignedIds.some((id) => String(id) === String(classroomId)))
    throw new AppError("You are not assigned to this classroom.", 403);
}

export const listAssignments = async (query = {}, user = null) => {
  const filter = { isArchived: { $ne: true } };
  if (query.classroom) filter.classroom = query.classroom;
  if (query.subject) filter.subject = query.subject;

  const assignedIds = await getAssignedClassroomIds(user);
  if (assignedIds !== null) {
    if (filter.classroom && !assignedIds.some((id) => String(id) === String(filter.classroom)))
      throw new AppError("You are not assigned to this classroom.", 403);
    filter.classroom = filter.classroom || { $in: assignedIds };
  }

  return Assignment.find(filter)
    .populate("classroom", "className section")
    .populate("subject", "name code")
    .populate("teacher", "name email")
    .sort({ dueDate: 1 })
    .lean();
};

export const createAssignment = async (input, file, user, requestId) => {
  const { classroom, subject, title, description, dueDate, maxMarks } = input;
  if (!classroom || !subject || !title || !dueDate)
    throw new AppError("classroom, subject, title, and dueDate are required.", 400);

  await assertClassroomAccess(classroom, user);

  const [room, subj] = await Promise.all([Classroom.findById(classroom), Subject.findById(subject)]);
  if (!room) throw new AppError("Classroom not found.", 404);
  if (!subj) throw new AppError("Subject not found.", 404);

  const assignment = await Assignment.create({
    classroom,
    subject,
    teacher: user.sub,
    title: String(title).trim(),
    description: description ? String(description).trim() : "",
    dueDate: new Date(dueDate),
    maxMarks: maxMarks != null ? Number(maxMarks) : null,
  });

  // The attachment is stored under the assignment's own _id, so the
  // assignment is created first to get a stable, unguessable id to build
  // the path from, then updated with the attachment right after.
  if (file) {
    const key = `assignments/${assignment._id}/${sanitizeFilename(file.originalname)}`;
    await saveBuffer({ key, buffer: file.buffer });
    assignment.attachment = {
      originalName: file.originalname,
      storedPath: key,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageType: "local",
    };
    await assignment.save();
  }

  await writeAudit({
    entityType: "assignment",
    entityId: assignment._id,
    action: "CREATE",
    changes: { after: { title: assignment.title, classroom: room.className + "-" + room.section, dueDate: assignment.dueDate } },
    requestId,
  });
  return assignment;
};

export const updateAssignment = async (id, input, user, requestId) => {
  const assignment = await Assignment.findById(id);
  if (!assignment) throw new AppError("Assignment not found.", 404);
  await assertClassroomAccess(assignment.classroom, user);

  const before = assignment.toObject();
  if (input.title) assignment.title = String(input.title).trim();
  if (input.description !== undefined) assignment.description = String(input.description).trim();
  if (input.dueDate) assignment.dueDate = new Date(input.dueDate);
  if (input.maxMarks !== undefined) assignment.maxMarks = input.maxMarks != null ? Number(input.maxMarks) : null;
  if (typeof input.isArchived === "boolean") assignment.isArchived = input.isArchived;

  await assignment.save();
  await writeAudit({
    entityType: "assignment",
    entityId: assignment._id,
    action: "UPDATE",
    changes: { before: { title: before.title, dueDate: before.dueDate }, after: { title: assignment.title, dueDate: assignment.dueDate } },
    requestId,
  });
  return assignment;
};

export const getAssignmentAttachmentPath = async (id, user) => {
  const assignment = await Assignment.findById(id).lean();
  if (!assignment) throw new AppError("Assignment not found.", 404);
  if (!assignment.attachment?.storedPath) throw new AppError("This assignment has no attachment.", 404);
  await assertClassroomAccess(assignment.classroom, user);

  return {
    key: assignment.attachment.storedPath,
    originalName: assignment.attachment.originalName,
    mimeType: assignment.attachment.mimeType,
  };
};
