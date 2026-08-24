import { Subject } from "../models/subject.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";

export const listSubjects = async (query = {}) => {
  const filter = {};
  if (query.includeInactive !== "true") filter.isActive = true;
  return Subject.find(filter).sort({ name: 1 }).lean();
};

export const createSubject = async (input, requestId) => {
  if (!input.name) throw new AppError("Subject name is required.", 400);
  try {
    const subject = await Subject.create({
      name: String(input.name).trim(),
      code: input.code ? String(input.code).trim().toUpperCase() : undefined,
    });
    await writeAudit({
      entityType: "subject",
      entityId: subject._id,
      action: "CREATE",
      changes: { after: subject.toObject() },
      requestId,
    });
    return subject;
  } catch (e) {
    if (e?.code === 11000) throw new AppError("A subject with this name already exists.", 409);
    throw e;
  }
};

export const updateSubject = async (id, input, requestId) => {
  const subject = await Subject.findById(id);
  if (!subject) throw new AppError("Subject not found.", 404);
  const before = subject.toObject();
  if (input.name) subject.name = String(input.name).trim();
  if (input.code !== undefined) subject.code = input.code ? String(input.code).trim().toUpperCase() : "";
  if (typeof input.isActive === "boolean") subject.isActive = input.isActive;
  await subject.save();
  await writeAudit({
    entityType: "subject",
    entityId: subject._id,
    action: "UPDATE",
    changes: { before, after: subject.toObject() },
    requestId,
  });
  return subject;
};
