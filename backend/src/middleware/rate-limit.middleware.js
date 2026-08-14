const stores = new Map();

export const createRateLimiter = ({ windowMs = 60_000, max = 120 } = {}) => (req, res, next) => {
  const key = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const current = stores.get(key);
  const entry = !current || now >= current.resetAt ? { count: 0, resetAt: now + windowMs } : current;
  entry.count += 1;
  stores.set(key, entry);
  res.setHeader("X-RateLimit-Limit", String(max));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));
  if (entry.count > max) {
    return res.status(429).json({ success: false, message: "Too many requests. Please try again later.", requestId: req.requestId });
  }
  next();
};
