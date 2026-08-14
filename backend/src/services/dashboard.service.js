import { Student } from "../models/student.model.js";
import { AppError } from "../utils/AppError.js";

const parseDateRange = (query = {}) => {
  const range = query.range || "all";
  const now = new Date();
  let from = null;
  if (range === "7d") from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (range === "30d") from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  else if (range !== "all") throw new AppError("range must be all, 7d or 30d.", 400);
  return from ? { createdAt: { $gte: from } } : {};
};

export const getDashboardStats = async (query = {}) => {
  const rangeFilter = parseDateRange(query);
  const activeFilter = { isDeleted: { $ne: true } };
  const filter = { ...activeFilter, ...rangeFilter };
  const [totalStudents, activeStudents, studentsByClass, studentsBySection, studentsByStatus, recentStudents, recentlyUpdated] = await Promise.all([
    Student.countDocuments(filter),
    Student.countDocuments({ ...filter, status: "active" }),
    Student.aggregate([{ $match: filter }, { $group: { _id: "$class", count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
    Student.aggregate([{ $match: filter }, { $group: { _id: { class: "$class", section: "$section" }, count: { $sum: 1 } } }, { $sort: { count: -1, "_id.class": 1, "_id.section": 1 } }]),
    Student.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }]),
    Student.find(filter).sort({ createdAt: -1 }).limit(5).select("studentId name rollNo class section status admissionNo dob createdAt").lean(),
    Student.find(filter).sort({ updatedAt: -1 }).limit(5).select("studentId name class section status updatedAt").lean(),
  ]);
  return {
    range: query.range || "all",
    totalStudents,
    activeStudents,
    inactiveStudents: Math.max(0, totalStudents - activeStudents),
    studentsByClass: studentsByClass.map((item) => ({ class: item._id, count: item.count })),
    studentsBySection: studentsBySection.map((item) => ({ class: item._id.class, section: item._id.section, count: item.count })),
    studentsByStatus: studentsByStatus.map((item) => ({ status: item._id, count: item.count })),
    recentStudents,
    recentlyUpdated,
  };
};
