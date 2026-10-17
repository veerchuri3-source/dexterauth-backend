const ok = (res, data, extra = {}) =>
  res.json({ status: "success", success: true, data, ...extra });

const fail = (res, code, message, extra = {}) =>
  res.status(code).json({ status: "error", success: false, message, ...extra });

const rateLimited = (res, message = "Too many requests. Please try again later.") =>
  res.status(429).json({ status: "rate_limited", success: false, message });

module.exports = { ok, fail, rateLimited };