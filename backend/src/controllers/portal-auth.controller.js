import * as portalAuth from "../services/portal-auth.service.js";

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/api/v1/portal/auth",
};

const meta = (req) => ({ userAgent: req.get("user-agent"), ip: req.ip });

export async function login(req, res, next) {
  try {
    const data = await portalAuth.portalLogin(req.body || {}, meta(req));
    const { refreshToken, ...body } = data;
    res.cookie("portal_refresh_token", refreshToken, {
      ...cookieOptions,
      maxAge: Number(process.env.PORTAL_REFRESH_TTL_DAYS || 7) * 86400000,
    });
    res.json({ success: true, data: body });
  } catch (e) {
    next(e);
  }
}

export async function refresh(req, res, next) {
  try {
    const data = await portalAuth.portalRefresh(req.cookies?.portal_refresh_token, meta(req));
    const { refreshToken, ...body } = data;
    res.cookie("portal_refresh_token", refreshToken, {
      ...cookieOptions,
      maxAge: Number(process.env.PORTAL_REFRESH_TTL_DAYS || 7) * 86400000,
    });
    res.json({ success: true, data: body });
  } catch (e) {
    next(e);
  }
}

export async function logout(req, res, next) {
  try {
    await portalAuth.portalLogout(req.cookies?.portal_refresh_token);
    res.clearCookie("portal_refresh_token", cookieOptions);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export async function changePassword(req, res, next) {
  try {
    const data = await portalAuth.changePortalPassword(
      req.portalUser.actorType,
      req.portalUser.sub,
      req.body || {},
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

export async function me(req, res) {
  res.json({ success: true, data: req.portalUser });
}
