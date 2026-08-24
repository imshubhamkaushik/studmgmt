import { GradingTerm } from "../models/grading-term.model.js";
import { AcademicYear } from "../models/academic-year.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";

export const listGradingTerms = async (query = {}) => {
  const filter = { isArchived: { $ne: true } };
  if (query.academicYear) filter.academicYear = query.academicYear;
  return GradingTerm.find(filter)
    .populate("academicYear", "name isActive")
    .sort({ order: 1, createdAt: 1 })
    .lean();
};

async function assertWeightBudget(academicYearId, weightPercent, excludeId = null) {
  const filter = { academicYear: academicYearId, isArchived: { $ne: true } };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await GradingTerm.find(filter).select("weightPercent").lean();
  const total = existing.reduce((sum, t) => sum + t.weightPercent, 0) + weightPercent;
  if (total > 100)
    throw new AppError(
      `Total weight for this academic year would be ${total}%, which exceeds 100%. Reduce this term's weight or another term's first.`,
      400,
    );
}

export const createGradingTerm = async (input, requestId) => {
  if (!input.academicYear || !input.name || input.weightPercent == null)
    throw new AppError("academicYear, name, and weightPercent are required.", 400);

  const year = await AcademicYear.findById(input.academicYear);
  if (!year) throw new AppError("Academic year not found.", 404);

  const weightPercent = Number(input.weightPercent);
  if (!Number.isFinite(weightPercent) || weightPercent <= 0 || weightPercent > 100)
    throw new AppError("weightPercent must be between 1 and 100.", 400);

  await assertWeightBudget(input.academicYear, weightPercent);

  try {
    const term = await GradingTerm.create({
      academicYear: input.academicYear,
      name: String(input.name).trim(),
      weightPercent,
      order: Number(input.order) || 0,
    });
    await writeAudit({
      entityType: "gradingTerm",
      entityId: term._id,
      action: "CREATE",
      changes: { after: term.toObject() },
      requestId,
    });
    return term;
  } catch (e) {
    if (e?.code === 11000)
      throw new AppError("A grading term with this name already exists for this academic year.", 409);
    throw e;
  }
};

export const updateGradingTerm = async (id, input, requestId) => {
  const term = await GradingTerm.findById(id);
  if (!term) throw new AppError("Grading term not found.", 404);
  const before = term.toObject();

  if (input.weightPercent != null) {
    const weightPercent = Number(input.weightPercent);
    if (!Number.isFinite(weightPercent) || weightPercent <= 0 || weightPercent > 100)
      throw new AppError("weightPercent must be between 1 and 100.", 400);
    await assertWeightBudget(term.academicYear, weightPercent, term._id);
    term.weightPercent = weightPercent;
  }
  if (input.name) term.name = String(input.name).trim();
  if (input.order != null) term.order = Number(input.order) || 0;
  if (typeof input.isArchived === "boolean") term.isArchived = input.isArchived;

  await term.save();
  await writeAudit({
    entityType: "gradingTerm",
    entityId: term._id,
    action: "UPDATE",
    changes: { before, after: term.toObject() },
    requestId,
  });
  return term;
};
