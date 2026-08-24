import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { User } from "../models/user.model.js";
import { setRequestActor } from "../utils/request-store.js";

export async function authenticate(req, res, next) {
  try {
    const header = req.get("authorization") || "";

    if (!header.startsWith("Bearer ")) {
      throw new AppError("Authentication is required.", 401);
    }

    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      throw new AppError("Server authentication is not configured.", 500);
    }

    const payload = verifyAccessToken(header.slice(7), secret);

    // A portal (student/guardian) token is signed with the same secret by
    // design, so it would otherwise pass signature verification here too.
    // Reject it explicitly rather than relying only on the User lookup
    // below incidentally failing (Student/Guardian ids live in different
    // collections, but an explicit check is the real boundary).
    if (payload.actorType) throw new AppError("Invalid or expired session.", 401);

    const user = await User.findById(payload.sub)
      .select("_id email role name isActive hasStaffPrivileges")
      .lean();

    if (!user?.isActive) throw new AppError("Your account is inactive or no longer available.", 401);

    req.user = {
      ...payload,
      role: user.role,
      email: user.email,
      name: user.name,
      hasStaffPrivileges: Boolean(user.hasStaffPrivileges),
    };

    setRequestActor(req.user);

    return next();
  } catch (error) {
    if (error?.statusCode) {
      return next(error);
    }

    return next(new AppError("Invalid or expired access token.", 401));
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user)
      return next(new AppError("Authentication is required.", 401));

    const effectiveRoles = [req.user.role];
    if (req.user.role === "teacher" && req.user.hasStaffPrivileges)
      effectiveRoles.push("staff");

    if (!effectiveRoles.some((role) => roles.includes(role)))
      return next(
        new AppError("You do not have permission to perform this action.", 403),
      );
    return next();
  };
}
