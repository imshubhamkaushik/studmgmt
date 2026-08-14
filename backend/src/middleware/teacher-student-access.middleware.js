import { assertTeacherStudentAccess } from "../services/teacher-access.service.js";

export async function enforceTeacherStudentAccess(req, res, next) {
  try {
    await assertTeacherStudentAccess(req.user, req.params.studentId);
    next();
  } catch (error) {
    next(error);
  }
}
