const config = require("../config");

/**
 * Sliding-window in-memory rate limiter.
 * Production note: swap the store with Redis (e.g. ioredis + INCR/EXPIRE) for
 * multi-instance deployments. The interface stays identical.
 */
class SlidingWindowRateLimiter {
  constructor({ windowMs, max, keyPrefix = "rl" }) {
    this.windowMs = windowMs;
    this.max = max;
    this.keyPrefix = keyPrefix;
    this.hits = new Map(); // key -> array of timestamps (ms)
    setInterval(() => this.sweep(), Math.max(60_000, windowMs)).unref();
  }

  sweep() {
    const cutoff = Date.now() - this.windowMs;
    for (const [k, arr] of this.hits) {
      const kept = arr.filter((t) => t > cutoff);
      if (kept.length === 0) this.hits.delete(k);
      else this.hits.set(k, kept);
    }
  }

  hit(key) {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const arr = (this.hits.get(key) || []).filter((t) => t > cutoff);
    if (arr.length >= this.max) {
      this.hits.set(key, arr);
      const oldest = arr[0];
      return { allowed: false, retryAfterMs: Math.max(0, oldest + this.windowMs - now) };
    }
    arr.push(now);
    this.hits.set(key, arr);
    return { allowed: true, remaining: this.max - arr.length };
  }
}

const limiter = new SlidingWindowRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
});

const clientLimiter = new SlidingWindowRateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.clientMax,
  keyPrefix: "rl-client",
});

function clientIp(req) {
  if (config.trustProxy) {
    return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}

function rateLimitMiddleware(lim = limiter) {
  return (req, res, next) => {
    const result = lim.hit(clientIp(req));
    res.setHeader("X-RateLimit-Limit", lim.max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, result.remaining ?? lim.max));
    if (!result.allowed) {
      res.setHeader("Retry-After", Math.ceil(result.retryAfterMs / 1000));
      return res.status(429).json({
        status: "rate_limited",
        success: false,
        message: "Too many requests. Please try again later.",
      });
    }
    next();
  };
}

module.exports = { rateLimitMiddleware, clientLimiter, clientIp };