import { TeacherClassroomAssignment } from "../models/teacher-classroom-assignment.model.js";
import { Classroom } from "../models/classroom.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { AppError } from "../utils/AppError.js";

export const getAssignedClassroomIds = async (user) => {
  if (user?.role !== "teacher") return null;
  return TeacherClassroomAssignment.find({ teacher: user.sub, isActive: true }).distinct("classroom");
};

export const applyTeacherStudentScope = async (user, filter = {}) => {
  const ids = await getAssignedClassroomIds(user);
  if (ids === null) return filter;
  const rooms = await Classroom.find({ _id: { $in: ids }, isActive: true }).select("className section").lean();
  const pairs = rooms.map((r) => ({ class: r.className, section: r.section }));
  if (!pairs.length) return { ...filter, _id: null };
  if (filter.class && filter.section) {
    if (!pairs.some((p) => p.class === filter.class && p.section === filter.section)) throw new AppError("You are not assigned to this classroom.", 403);
    return filter;
  }
  return { ...filter, $and: [filter.$or ? { $or: filter.$or } : {}, { $or: pairs }] };
};

export const assertTeacherStudentAccess = async (user, studentId) => {
  if (user?.role !== "teacher") return;
  const ids = await getAssignedClassroomIds(user);
  const ok = await Enrollment.exists({ student: studentId, classroom: { $in: ids }, status: "active" });
  if (!ok) throw new AppError("You are not authorized to access this student.", 403);
};

export const applyTeacherEnrollmentScope = async (user, filter = {}) => {
  const ids = await getAssignedClassroomIds(user);
  if (ids === null) return filter;
  if (filter.classroom && !ids.some((id) => String(id) === String(filter.classroom))) throw new AppError("You are not assigned to this classroom.", 403);
  return { ...filter, classroom: filter.classroom || { $in: ids } };
};
