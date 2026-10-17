const { fail } = require("../utils/responses");

function notFound(req, res) {
  return fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  console.error("[error]", err.message, err.stack?.split("\n").slice(0, 3).join(" | "));
  if (err.type === "entity.too.large") {
    return fail(res, 413, "Payload too large");
  }
  if (err.code === "23505") {
    return fail(res, 409, "Duplicate value. A record with that value already exists.");
  }
  if (err.code === "23503") {
    return fail(res, 409, "Referenced record does not exist.");
  }
  if (err.message && err.message.includes("invalid input syntax")) {
    return fail(res, 400, "Invalid value format");
  }
  // In dev, surface the actual error message to help the frontend / tests
  if (process.env.NODE_ENV !== 'production') {
    return fail(res, 500, err.message || "Internal server error");
  }
  return fail(res, 500, "Internal server error");
}

module.exports = { notFound, errorHandler };