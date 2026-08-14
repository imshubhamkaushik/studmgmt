import net from "node:net";

const stores = new Map();

const parseRedisUrl = (value) => {
  const url = new URL(value);
  
  if (url.protocol !== "redis:") throw new Error("REDIS_URL must use redis://");
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || null,
    db:
      url.pathname && url.pathname !== "/"
        ? Number(url.pathname.slice(1))
        : null,
  };
};

const encode = (parts) =>
  `*${parts.length}\r\n${parts
    .map(
      (part) => 
        `$${Buffer.byteLength(String(part))}\r\n${part}\r\n`,
    )
    .join("")}`;

const redisCommand = (urlValue, parts, timeoutMs = 750) =>
  new Promise((resolve, reject) => {
    const config = parseRedisUrl(urlValue);
    
    const socket = net.createConnection({
      host: config.host,
      port: config.port,
    });
    
    let buffer = "";
    
    const fail = (error) => {
      socket.destroy();
      reject(error);
    };
    
    const timer = setTimeout(
      () => fail(new Error("Redis rate-limit request timed out.")),
      timeoutMs,
    );
    
    const send = () => {
      const commands = [];
      if (config.password) commands.push(["AUTH", config.password]);
      if (Number.isInteger(config.db) && config.db >= 0)
        commands.push(["SELECT", config.db]);
      commands.push(parts);
      socket.write(commands.map(encode).join(""));
    };
    
    socket.once("connect", send);
    
    socket.once("error", fail);
    
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      
      const lines = buffer.split("\r\n").filter(Boolean);
      if (!buffer.endsWith("\r\n") || lines.length < 1) return;
      
      const last = lines.at(-1);
      
      clearTimeout(timer);
      
      socket.end();
      
      if (last.startsWith("-")) return reject(new Error(last.slice(1)));
      
      if (last.startsWith(":")) return resolve(Number(last.slice(1)));
      
      if (last.startsWith("+")) return resolve(last.slice(1));
      
      return resolve(last);
    });
  });

const memoryHit = (key, windowMs) => {
  const now = Date.now();
  
  const current = stores.get(key);
  
  const entry =
    !current || now >= current.resetAt
      ? { count: 0, resetAt: now + windowMs }
      : current;
  entry.count += 1;
  
  stores.set(key, entry);
  
  return { count: entry.count, resetAt: entry.resetAt };
};

const redisHit = async (key, windowMs) => {
  const redisUrl = process.env.REDIS_URL;
  
  const redisKey = `studmgmt:ratelimit:${key}`;
  
  const count = await redisCommand(redisUrl, ["INCR", redisKey]);
  
  if (count === 1)
    await redisCommand(redisUrl, ["PEXPIRE", redisKey, String(windowMs)]);
  
  const ttl = await redisCommand(redisUrl, ["PTTL", redisKey]);
  
  return { count, resetAt: Date.now() + Math.max(0, Number(ttl) || windowMs) };
};

export const createRateLimiter =
  ({ windowMs = 60_000, max = 120, failClosed = false } = {}) =>
  async (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    
    let hit;
    
    try {
      hit = process.env.REDIS_URL
        ? await redisHit(key, windowMs)
        : memoryHit(key, windowMs);
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "warn",
          event: "rate_limit_store_unavailable",
          message: error.message,
          requestId: req.requestId,
        }),
      );
      if (failClosed)
        return res
          .status(503)
          .json({
            success: false,
            message: "Rate limit service unavailable.",
            requestId: req.requestId,
          });
      hit = memoryHit(key, windowMs);
    }
    
    res.setHeader("X-RateLimit-Limit", String(max));
    
    res.setHeader(
      "X-RateLimit-Remaining",
      String(Math.max(0, max - hit.count)),
    );
    
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(hit.resetAt / 1000)));
    
    if (hit.count > max)
      return res
        .status(429)
        .json({
          success: false,
          message: "Too many requests. Please try again later.",
          requestId: req.requestId,
        });
    next();
  };
