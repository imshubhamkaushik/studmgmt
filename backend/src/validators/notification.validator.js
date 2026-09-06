import { AppError } from "../utils/AppError.js";
import { NOTIFICATION_TYPES, NOTIFICATION_LEVELS } from "../models/notification.model.js";

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export const normalizeCreateNotification = (body) => {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 150)
    throw new AppError("title is required and cannot exceed 150 characters.", 400);

  const bodyText = typeof body?.body === "string" ? body.body.trim() : "";
  if (bodyText.length > 1000) throw new AppError("body cannot exceed 1000 characters.", 400);

  const type = NOTIFICATION_TYPES.includes(body?.type) ? body.type : "announcement";
  const level = NOTIFICATION_LEVELS.includes(body?.scope?.level) ? body.scope.level : "school";

  const scope = { level };

  if (level === "classroom") {
    if (!OBJECT_ID_RE.test(String(body?.scope?.classroom || "")))
      throw new AppError("scope.classroom must be a valid id when level is 'classroom'.", 400);
    scope.classroom = body.scope.classroom;
  }

  if (level === "student") {
    if (!OBJECT_ID_RE.test(String(body?.scope?.student || "")))
      throw new AppError("scope.student must be a valid id when level is 'student'.", 400);
    scope.student = body.scope.student;
  }

  return { type, title, body: bodyText, scope };
};
