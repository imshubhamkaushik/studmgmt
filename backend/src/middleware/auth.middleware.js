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

    const user = await User.findById(payload.sub)
      .select("_id email role name isActive")
      .lean();

    if (!user?.isActive) throw new AppError("Your account is inactive or no longer available.", 401);

    req.user = {
      ...payload,
      role: user.role,
      email: user.email,
      name: user.name,
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
    if (!roles.includes(req.user.role))
      return next(
        new AppError("You do not have permission to perform this action.", 403),
      );
    return next();
  };
}
