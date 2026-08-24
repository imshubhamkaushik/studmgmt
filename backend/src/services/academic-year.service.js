import { AcademicYear } from "../models/academic-year.model.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "./audit.service.js";

const clean = (v, max) =>
  typeof v === "string" && v.trim() && v.trim().length <= max ? v.trim() : null;

const dates = (body) => {
  const name = clean(body.name, 30);
  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (!name) throw new AppError("Academic year name is required.", 400);
  if (Number.isNaN(startDate) || Number.isNaN(endDate) || endDate <= startDate)
    throw new AppError("Valid startDate and endDate are required.", 400);
  return { name, startDate, endDate };
};

export const listAcademicYears = () =>
  AcademicYear.find({ isArchived: { $ne: true } })
    .sort({ startDate: -1 })
    .lean();

export const createAcademicYear = async (body, requestId) => {
  const data = dates(body);
  
  if (body.isActive) {
    await AcademicYear.updateMany({ isActive: true }, { isActive: false });
    data.isActive = true;
  }
  
  const item = await AcademicYear.create(data);
  
  await writeAudit({
    entityType: "academicYear",
    entityId: item._id,
    action: "CREATE",
    changes: { after: item.toObject() },
    requestId,
  });
  
  return item;
};

export const updateAcademicYear = async (id, body, requestId) => {
  const item = await AcademicYear.findOne({
    _id: id,
    isArchived: { $ne: true },
  });
  
  if (!item) throw new AppError("Academic year not found.", 404);
  
  const before = item.toObject();
  
  const data = dates({ ...item.toObject(), ...body });
  
  Object.assign(item, data);
  
  if (body.isActive === true) {
    await AcademicYear.updateMany(
      { _id: { $ne: id }, isActive: true },
      { isActive: false },
    );
    item.isActive = true;
  }
  
  await item.save();
  
  await writeAudit({
    entityType: "academicYear",
    entityId: item._id,
    action: "UPDATE",
    changes: { before, after: item.toObject() },
    requestId,
  });
  
  return item;
};

export const setActiveAcademicYear = async (id, requestId) => {
  
  const item = await AcademicYear.findOne({
    _id: id,
    isArchived: { $ne: true },
  });
  
  if (!item) throw new AppError("Academic year not found.", 404);
  
  await AcademicYear.updateMany({ isActive: true }, { isActive: false });
  
  item.isActive = true;
  
  await item.save();
  
  await writeAudit({
    entityType: "academicYear",
    entityId: item._id,
    action: "SET_ACTIVE",
    changes: { after: item.toObject() },
    requestId,
  });
  
  return item;
};
