import { verifyPortalAccessToken } from "../services/portal-auth.service.js";
import { Student } from "../models/student.model.js";
import { Guardian } from "../models/guardian.model.js";
import { AppError } from "../utils/AppError.js";

export async function authenticatePortal(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new AppError("Authentication is required.", 401);

    const payload = await verifyPortalAccessToken(token);

    // Re-check the underlying account is still active/present on every
    // request, exactly like the staff authenticate() middleware does —
    // an access token issued before an account was deactivated (or a
    // student record archived) should stop working immediately, not
    // linger until it expires.
    if (payload.actorType === "student") {
      const student = await Student.findById(payload.sub).select("_id isDeleted").lean();
      if (!student || student.isDeleted)
        throw new AppError("This account is no longer available.", 401);
    } else {
      const guardian = await Guardian.findById(payload.sub).select("_id isActive").lean();
      if (!guardian?.isActive) throw new AppError("This account is no longer available.", 401);
    }

    req.portalUser = {
      sub: payload.sub,
      actorType: payload.actorType,
      studentId: payload.studentId,
      name: payload.name,
    };
    next();
  } catch (err) {
    next(err instanceof AppError ? err : new AppError("Invalid or expired session.", 401));
  }
}
