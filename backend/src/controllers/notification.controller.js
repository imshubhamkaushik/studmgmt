import * as service from "../services/notification.service.js";
import { normalizeCreateNotification } from "../validators/notification.validator.js";
import { getAssignedClassroomIds, assertTeacherStudentAccess } from "../services/teacher-access.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const create = asyncHandler(async (req, res) => {
  const payload = normalizeCreateNotification(req.body);

  // A teacher's ability to broadcast is scoped to what they actually
  // teach — admin/staff have no such restriction (getAssignedClassroomIds
  // returns null for them).
  if (req.user.role === "teacher") {
    if (payload.scope.level === "school")
      throw new AppError("Only admin or staff can send a school-wide announcement.", 403);

    if (payload.scope.level === "classroom") {
      const assignedIds = await getAssignedClassroomIds(req.user);
      if (!assignedIds.some((id) => String(id) === String(payload.scope.classroom)))
        throw new AppError("You are not assigned to this classroom.", 403);
    }

    if (payload.scope.level === "student") {
      await assertTeacherStudentAccess(req.user, payload.scope.student);
    }
  }

  const notification = await service.createNotification({ ...payload, createdBy: req.user.sub });
  res.status(201).json({ success: true, message: "Notification created.", data: notification });
});

export const listMine = asyncHandler(async (req, res) => {
  const viewer = await service.resolveViewer(req);
  res.status(200).json({ success: true, data: await service.listForViewer(viewer, req.query) });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const viewer = await service.resolveViewer(req);
  res.status(200).json({ success: true, data: { count: await service.getUnreadCount(viewer) } });
});

export const markRead = asyncHandler(async (req, res) => {
  const viewer = await service.resolveViewer(req);
  res.status(200).json({ success: true, data: await service.markAsRead(req.params.id, viewer) });
});

export const markAllRead = asyncHandler(async (req, res) => {
  const viewer = await service.resolveViewer(req);
  res.status(200).json({ success: true, data: await service.markAllAsRead(viewer) });
});
