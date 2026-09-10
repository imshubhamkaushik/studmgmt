import * as service from "../services/period-attendance.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const getRoster = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) throw new AppError("date query parameter is required.", 400);
  res.json({ success: true, data: await service.getPeriodRoster(req.params.timetableEntryId, date, req.user) });
});

export const bulkMark = asyncHandler(async (req, res) =>
  res.json({
    success: true,
    data: await service.bulkMarkPeriod(
      req.params.timetableEntryId,
      req.body.date,
      req.body.entries,
      req.user,
      req.requestId,
    ),
  }),
);
