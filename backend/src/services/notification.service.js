import { Notification } from "../models/notification.model.js";
import { Student } from "../models/student.model.js";
import { AppError } from "../utils/AppError.js";

// Resolves whoever is making the request — a staff User (req.user) or a
// portal Student/Guardian (req.portalUser) — into one shape the rest of
// this service works with. Portal tokens carry the linked student's
// human-readable studentId (not its Mongo _id), so guardians resolve to
// the same studentObjectId as the student they're linked to.
export const resolveViewer = async (req) => {
  if (req.portalUser) {
    const { actorType, sub, studentId: studentCode } = req.portalUser;
    const student = await Student.findOne({ studentId: studentCode }).select("_id").lean();
    if (!student) throw new AppError("Linked student record could not be found.", 404);
    return { readKey: `${actorType}:${sub}`, studentObjectId: student._id, isStaff: false };
  }
  if (req.user) return { readKey: `user:${req.user.sub}`, studentObjectId: null, isStaff: true };
  throw new AppError("Authentication is required.", 401);
};

const visibilityFilter = (viewer) =>
  viewer.isStaff
    ? {}
    : {
        $or: [
          { "scope.level": "school" },
          { "scope.level": "student", "scope.student": viewer.studentObjectId },
        ],
      };

export const createNotification = async ({ type, title, body, scope, createdBy }) =>
  Notification.create({ type, title, body, scope, createdBy: createdBy || null });

// Convenience wrapper used by other services (mark-entry, report-card) so
// call sites don't have to build the scope object by hand every time.
export const notifyStudent = async (studentObjectId, { type, title, body }) =>
  createNotification({
    type,
    title,
    body,
    scope: { level: "student", student: studentObjectId },
  });

// Same idea, for notifying one specific staff member (e.g. an
// assignment's owning teacher) rather than every staff account.
export const notifyUser = async (userObjectId, { type, title, body }) =>
  createNotification({
    type,
    title,
    body,
    scope: { level: "teacher", recipientUser: userObjectId },
  });

export const listForViewer = async (viewer, { page = 1, limit = 20 } = {}) => {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const filter = visibilityFilter(viewer);

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    items: items.map(({ readBy, ...rest }) => ({ ...rest, isRead: readBy?.includes(viewer.readKey) })),
    total,
    page: safePage,
  };
};

export const getUnreadCount = async (viewer) =>
  Notification.countDocuments({ ...visibilityFilter(viewer), readBy: { $ne: viewer.readKey } });

export const markAsRead = async (notificationId, viewer) => {
  const result = await Notification.updateOne(
    { _id: notificationId },
    { $addToSet: { readBy: viewer.readKey } },
  );
  if (!result.matchedCount) throw new AppError("Notification not found.", 404);
  return { marked: true };
};

export const markAllAsRead = async (viewer) => {
  await Notification.updateMany(visibilityFilter(viewer), { $addToSet: { readBy: viewer.readKey } });
  return { marked: true };
};
