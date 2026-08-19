import { Classroom } from "../models/classroom.model.js";
import { AcademicYear } from "../models/academic-year.model.js";
import { Enrollment } from "../models/enrollment.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";

const dataOf = (b) => {
  const className = String(b.className ?? "").trim(),
    section = String(b.section ?? "").trim();
  
  const capacity =
    b.capacity === "" || b.capacity == null ? null : Number(b.capacity);
  
  if (!className || !section)
    throw new AppError("className and section are required.", 400);
  
  if (
    capacity !== null &&
    (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000)
  )
    throw new AppError("capacity must be an integer between 1 and 10000.", 400);
  
  return { className, section, capacity };
};

export const listClassrooms = async (q) => {
  const filter = {};
  
  if (q.academicYear) filter.academicYear = q.academicYear;
  
  if (q.includeInactive !== "true") filter.isActive = true;
  
  const rooms = await Classroom.find(filter)
    .populate("academicYear", "name isActive")
    .sort({ className: 1, section: 1 })
    .lean();
  
  return Promise.all(
    rooms.map(async (r) => ({
      ...r,
      studentCount: await Enrollment.countDocuments({
        classroom: r._id,
        status: "active",
      }),
    })),
  );
};

export const createClassroom = async (b, requestId) => {
  const data = dataOf(b);
  
  const year = await AcademicYear.findById(b.academicYear);
  
  if (!year || year.isArchived)
    throw new AppError("Valid academicYear is required.", 400);
  
  const room = await Classroom.create({ ...data, academicYear: year._id });
  
  await writeAudit({
    entityType: "classroom",
    entityId: room._id,
    action: "CREATE",
    changes: { after: room.toObject() },
    requestId,
  });
  
  return room;
};

export const updateClassroom = async (id, b, requestId) => {
  const room = await Classroom.findById(id);
  
  if (!room) throw new AppError("Classroom not found.", 404);
  
  const before = room.toObject();
  
  Object.assign(room, dataOf({ ...room.toObject(), ...b }));
  
  if (typeof b.isActive === "boolean") room.isActive = b.isActive;
  
  await room.save();
  
  await writeAudit({
    entityType: "classroom",
    entityId: room._id,
    action: "UPDATE",
    changes: { before, after: room.toObject() },
    requestId,
  });
  
  return room;
};

const DEFAULT_CLASSES = Array.from({ length: 12 }, (_, i) => String(i + 1));
const DEFAULT_SECTIONS = ["A", "B", "C"];

// Bulk-creates classes 1-12, each with sections A/B/C, for a given academic
// year. Safe to run more than once — any combination that already exists
// (enforced by the {academicYear, className, section} unique index) is
// silently skipped rather than causing the whole batch to fail.
export const generateDefaultClassrooms = async (academicYearId, requestId) => {
  const year = await AcademicYear.findById(academicYearId);
  if (!year || year.isArchived)
    throw new AppError("Valid academicYear is required.", 400);

  const existing = await Classroom.find({ academicYear: year._id })
    .select("className section")
    .lean();
  const existingKeys = new Set(
    existing.map((r) => `${r.className}::${r.section}`),
  );

  const toCreate = [];
  for (const className of DEFAULT_CLASSES) {
    for (const section of DEFAULT_SECTIONS) {
      if (!existingKeys.has(`${className}::${section}`))
        toCreate.push({ className, section, academicYear: year._id });
    }
  }

  if (toCreate.length === 0) return { created: 0, skipped: existing.length };

  const created = await Classroom.insertMany(toCreate, { ordered: false });

  await writeAudit({
    entityType: "classroom",
    entityId: year._id,
    action: "GENERATE_DEFAULTS",
    changes: { after: { count: created.length, academicYear: year.name } },
    requestId,
  });

  return { created: created.length, skipped: existing.length };
};
