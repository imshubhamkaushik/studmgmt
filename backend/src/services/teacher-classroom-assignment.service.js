import mongoose from "mongoose";
import { TeacherClassroomAssignment as Assignment } from "../models/teacher-classroom-assignment.model.js";
import { User } from "../models/user.model.js";
import { Classroom } from "../models/classroom.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";

export async function assignTeacher(
  { teacherId, classroomId },
  requestId,
  actor,
) {
  if (
    !mongoose.isValidObjectId(teacherId) ||
    !mongoose.isValidObjectId(classroomId)
  )
    throw new AppError("Invalid teacher or classroom ID.", 400);
  
  const teacher = await User.findOne({
    _id: teacherId,
    role: "teacher",
    isActive: true,
  });
  
  if (!teacher) throw new AppError("Active teacher not found.", 404);
  
  const classroom = await Classroom.findById(classroomId);
  
  if (!classroom) throw new AppError("Classroom not found.", 404);
  
  const row = await Assignment.findOneAndUpdate(
    { teacher: teacherId, classroom: classroomId },
    { $set: { isActive: true } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  
  await writeAudit({
    entityType: "teacher_classroom_assignment",
    entityId: row._id,
    action: "ASSIGN",
    changes: { teacherId, classroomId },
    requestId,
    actor: actor?.sub,
    actorEmail: actor?.email,
  });
  
  return row;
}
export async function listAssignments(query = {}) {
  const f = {};
  
  if (query.teacherId) f.teacher = query.teacherId;
  
  if (query.classroomId) f.classroom = query.classroomId;
  
  if (query.activeOnly === "true") f.isActive = true;
  
  return Assignment.find(f)
    .populate("teacher", "name email role")
    .populate("classroom", "className section academicYear")
    .sort({ createdAt: -1 })
    .lean();
}
export async function revokeAssignment(id, requestId, actor) {
  const row = await Assignment.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true },
  );
  
  if (!row) throw new AppError("Assignment not found.", 404);
  
  await writeAudit({
    entityType: "teacher_classroom_assignment",
    entityId: row._id,
    action: "REVOKE",
    requestId,
    actor: actor?.sub,
    actorEmail: actor?.email,
  });
  
  return row;
}
export async function teacherClassroomIds(userId) {
  const rows = await Assignment.find({ teacher: userId, isActive: true })
    .select("classroom")
    .lean();
  
  return rows.map((x) => String(x.classroom));
}
