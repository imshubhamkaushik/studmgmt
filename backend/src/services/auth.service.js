import { User } from "../models/user.model.js";
import { Session } from "../models/session.model.js";
import { AppError } from "../utils/AppError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAccessToken } from "../utils/jwt.js";
import {
  createRefreshToken,
  hashRefreshToken,
} from "../utils/refresh-token.js";

const accessTtl = () => Number(process.env.JWT_ACCESS_TTL_SECONDS || 900);

const refreshDays = () => Number(process.env.JWT_REFRESH_TTL_DAYS || 7);

const publicUser = (u) => ({
  id: u._id.toString(),
  name: u.name,
  email: u.email,
  role: u.role,
  isActive: u.isActive,
});

const issueAccess = (u) =>
  signAccessToken(
    { sub: u._id.toString(), email: u.email, name: u.name, role: u.role },
    process.env.JWT_SECRET,
    accessTtl(),
  );

export async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    password = process.env.ADMIN_PASSWORD;
  
  if (!email || !password) return;
  
  if (password.length < 12)
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  
  if (await User.exists({ email })) return;
  
  const { hash, salt } = hashPassword(password);
  
  await User.create({
    name: process.env.ADMIN_NAME || "Administrator",
    email,
    passwordHash: hash,
    passwordSalt: salt,
    role: "admin",
  });
}

async function createSession(user, meta = {}) {
  const refreshToken = createRefreshToken();
  
  const expiresAt = new Date(Date.now() + refreshDays() * 86400000);
  
  const session = await Session.create({
    user: user._id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 500) || null,
    ip: meta.ip || null,
  });
  
  return { refreshToken, session };
}

export async function login({ email, password }, meta = {}) {
  if (!email || !password)
    throw new AppError("Email and password are required.", 400);
  
  const user = await User.findOne({
    email: String(email).trim().toLowerCase(),
  }).select("+passwordHash +passwordSalt");
  
  if (
    !user ||
    !user.isActive ||
    !verifyPassword(String(password), user.passwordHash, user.passwordSalt)
  )
    throw new AppError("Invalid email or password.", 401);
  
  user.lastLoginAt = new Date();
  
  await user.save();
  
  const { refreshToken } = await createSession(user, meta);
  
  return {
    user: publicUser(user),
    accessToken: issueAccess(user),
    expiresInSeconds: accessTtl(),
    refreshToken,
  };
}

export async function refresh(rawToken, meta = {}) {
  if (!rawToken) throw new AppError("Refresh token is required.", 401);
  
  const old = await Session.findOne({
    tokenHash: hashRefreshToken(rawToken),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).populate("user");
  
  if (!old || !old.user?.isActive)
    throw new AppError("Invalid or expired refresh session.", 401);
  
  const { refreshToken, session } = await createSession(old.user, meta);
  
  old.revokedAt = new Date();
  
  old.replacedBy = session._id;
  
  await old.save();
  
  return {
    user: publicUser(old.user),
    accessToken: issueAccess(old.user),
    expiresInSeconds: accessTtl(),
    refreshToken,
  };
}

export async function logout(rawToken) {
  if (!rawToken) return;
  
  await Session.updateOne(
    { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function getMe(id) {
  const u = await User.findById(id);
  
  if (!u || !u.isActive)
    throw new AppError("User account is unavailable.", 401);
  
  return publicUser(u);
}

export async function listUsers() {
  return User.find()
    .select("name email role isActive lastLoginAt createdAt")
    .sort({ createdAt: -1 });
}

export async function createUser(input) {
  if (!input.name || !input.email || !input.password || !input.role)
    throw new AppError("Name, email, password and role are required.", 400);
  
  if (!["admin", "staff", "teacher"].includes(input.role))
    throw new AppError("Invalid role.", 400);
  
  if (String(input.password).length < 12)
    throw new AppError("Password must be at least 12 characters.", 400);
  
  const { hash, salt } = hashPassword(String(input.password));
  
  try {
    return publicUser(
      await User.create({
        name: String(input.name).trim(),
        email: String(input.email).trim().toLowerCase(),
        passwordHash: hash,
        passwordSalt: salt,
        role: input.role,
      }),
    );
  } catch (e) {
    if (e?.code === 11000)
      throw new AppError("A user with this email already exists.", 409);
    throw e;
  }
}

export async function updateUser(id, input) {
  const u = await User.findById(id).select("+passwordHash +passwordSalt");
  
  if (!u) throw new AppError("User not found.", 404);
  
  if (input.role) {
    if (!["admin", "staff", "teacher"].includes(input.role))
      throw new AppError("Invalid role.", 400);
    u.role = input.role;
  }
  
  if (typeof input.isActive === "boolean") u.isActive = input.isActive;
  
  if (input.name) u.name = String(input.name).trim();
  
  if (input.password) {
    if (String(input.password).length < 12)
      throw new AppError("Password must be at least 12 characters.", 400);
    const { hash, salt } = hashPassword(String(input.password));
    u.passwordHash = hash;
    u.passwordSalt = salt;
  }
  
  await u.save();
  
  if (!u.isActive)
    await Session.updateMany(
      { user: u._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  
  return publicUser(u);
}
