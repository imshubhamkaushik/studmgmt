import { Student } from "../models/student.model.js";
import { Guardian } from "../models/guardian.model.js";
import { PortalSession } from "../models/portal-session.model.js";
import { AppError } from "../utils/AppError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { signAccessToken, verifyAccessToken } from "../utils/jwt.js";
import { createRefreshToken, hashRefreshToken } from "../utils/refresh-token.js";
import { parsePortalUsername } from "../utils/portal-credentials.js";

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;
const accessTtl = () => Number(process.env.PORTAL_ACCESS_TTL_SECONDS || 900);
const refreshDays = () => Number(process.env.PORTAL_REFRESH_TTL_DAYS || 7);

function issueAccess(actorType, actorId, studentId, name) {
  return signAccessToken(
    { sub: actorId.toString(), actorType, studentId, name },
    process.env.JWT_SECRET,
    accessTtl(),
  );
}

async function createPortalSession(actorType, actorId, meta = {}) {
  const rawToken = createRefreshToken();
  await PortalSession.create({
    actorType,
    actorId,
    tokenHash: hashRefreshToken(rawToken),
    expiresAt: new Date(Date.now() + refreshDays() * 86400000),
    userAgent: meta.userAgent || null,
    ip: meta.ip || null,
  });
  return rawToken;
}

function lockoutError(lockedUntil) {
  const minutesLeft = Math.ceil((lockedUntil - Date.now()) / 60000);
  return new AppError(
    `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`,
    423,
  );
}

// Shared lockout bookkeeping for either a Student or a Guardian document —
// both carry the same portalFailedLoginAttempts/portalLockedUntil pair, so
// this one function handles both without duplicating the logic per actor
// type.
async function verifyAndTrackAttempt(doc, password) {
  if (doc.portalLockedUntil && doc.portalLockedUntil > new Date())
    throw lockoutError(doc.portalLockedUntil);

  const valid =
    doc.passwordHash && doc.passwordSalt && verifyPassword(password, doc.passwordHash, doc.passwordSalt);

  if (!valid) {
    doc.portalFailedLoginAttempts = (doc.portalFailedLoginAttempts || 0) + 1;
    if (doc.portalFailedLoginAttempts >= LOCKOUT_THRESHOLD) {
      doc.portalLockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
      doc.portalFailedLoginAttempts = 0;
    }
    await doc.save();
    throw new AppError("Invalid username or password.", 401);
  }

  doc.portalFailedLoginAttempts = 0;
  doc.portalLockedUntil = null;
  await doc.save();
}

export async function portalLogin({ username, password }, meta = {}) {
  if (!username || !password) throw new AppError("Username and password are required.", 400);
  const { type, studentId } = parsePortalUsername(username);

  const student = await Student.findOne({ studentId }).select("+passwordHash +passwordSalt");
  if (!student || student.isDeleted) throw new AppError("Invalid username or password.", 401);

  if (type === "student") {
    await verifyAndTrackAttempt(student, password);
    const refreshToken = await createPortalSession("student", student._id, meta);
    return {
      actor: {
        type: "student",
        id: student._id,
        name: student.name,
        studentId: student.studentId,
        usingDefaultPassword: !student.passwordChangedAt,
      },
      accessToken: issueAccess("student", student._id, student.studentId, student.name),
      expiresInSeconds: accessTtl(),
      refreshToken,
    };
  }

  const guardian = await Guardian.findOne({ student: student._id }).select("+passwordHash +passwordSalt");
  if (!guardian?.isActive) throw new AppError("Invalid username or password.", 401);

  await verifyAndTrackAttempt(guardian, password);
  const refreshToken = await createPortalSession("guardian", guardian._id, meta);
  return {
    actor: {
      type: "guardian",
      id: guardian._id,
      name: guardian.name || "Parent/Guardian",
      studentId: student.studentId,
      studentName: student.name,
      usingDefaultPassword: !guardian.passwordChangedAt,
    },
    accessToken: issueAccess("guardian", guardian._id, student.studentId, guardian.name || "Parent/Guardian"),
    expiresInSeconds: accessTtl(),
    refreshToken,
  };
}

async function loadActor(actorType, actorId) {
  if (actorType === "student") {
    const student = await Student.findById(actorId).select("+passwordHash +passwordSalt");
    if (!student || student.isDeleted) return null;
    return { doc: student, studentId: student.studentId, name: student.name, studentDoc: student };
  }
  const guardian = await Guardian.findById(actorId).select("+passwordHash +passwordSalt");
  if (!guardian?.isActive) return null;
  const student = await Student.findById(guardian.student);
  if (!student || student.isDeleted) return null;
  return { doc: guardian, studentId: student.studentId, name: guardian.name || "Parent/Guardian", studentDoc: student };
}

export async function portalRefresh(rawToken, meta = {}) {
  if (!rawToken) throw new AppError("Refresh token is required.", 401);

  const old = await PortalSession.findOne({
    tokenHash: hashRefreshToken(rawToken),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!old) throw new AppError("Invalid or expired refresh session.", 401);

  const actor = await loadActor(old.actorType, old.actorId);
  if (!actor) throw new AppError("Invalid or expired refresh session.", 401);

  const refreshToken = await createPortalSession(old.actorType, old.actorId, meta);
  old.revokedAt = new Date();
  await old.save();

  return {
    accessToken: issueAccess(old.actorType, old.actorId, actor.studentId, actor.name),
    expiresInSeconds: accessTtl(),
    refreshToken,
  };
}

export async function portalLogout(rawToken) {
  if (!rawToken) return;
  await PortalSession.updateOne(
    { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function verifyPortalAccessToken(token) {
  const payload = verifyAccessToken(token, process.env.JWT_SECRET);
  if (payload.actorType !== "student" && payload.actorType !== "guardian")
    throw new Error("Not a portal token.");
  return payload;
}

// Self-service only — there is deliberately no admin/staff path to reset a
// student or guardian's password, and no forced-reset flow. The account
// holder decides if and when to move off the default.
export async function changePortalPassword(actorType, actorId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword)
    throw new AppError("Current password and new password are required.", 400);
  if (String(newPassword).length < 8)
    throw new AppError("New password must be at least 8 characters.", 400);

  const Model = actorType === "student" ? Student : Guardian;
  const doc = await Model.findById(actorId).select("+passwordHash +passwordSalt");
  if (!doc) throw new AppError("Account not found.", 404);

  const valid = doc.passwordHash && verifyPassword(currentPassword, doc.passwordHash, doc.passwordSalt);
  if (!valid) throw new AppError("Current password is incorrect.", 401);

  const { hash, salt } = hashPassword(String(newPassword));
  doc.passwordHash = hash;
  doc.passwordSalt = salt;
  doc.passwordChangedAt = new Date();
  await doc.save();

  // A password change is exactly the kind of event that should invalidate
  // any other logged-in session, mirroring the same rule applied to staff
  // password resets.
  await PortalSession.updateMany(
    { actorType, actorId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  return { changed: true };
}
