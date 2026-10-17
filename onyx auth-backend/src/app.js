const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const path = require("path");
const config = require("./config");
const { rateLimitMiddleware, clientLimiter } = require("./middleware/rateLimit");
const { notFound, errorHandler } = require("./middleware/errors");
const devRoutes = require("./routes/dev");
const adminRoutes = require("./routes/admin");
const customerRoutes = require("./routes/customer");
const clientV2Routes = require("./routes/clientV2");

const app = express();

app.set("trust proxy", config.trustProxy ? 1 : 0);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: config.isProd
      ? { maxAge: 63072000, includeSubDomains: true, preload: true }
      : false,
  })
);
app.use(compression());
// Strict CORS in production: reject unknown origins instead of silently allowing
const allowAllCors = config.corsOrigins.includes("*");
if (allowAllCors && config.isProd) {
  console.warn("[cors] WARNING: CORS_ORIGINS=* in production — set to your frontend domain(s) for security");
}
// Normalize origins (strip trailing slash) so https://x.vercel.app and https://x.vercel.app/ both match
const normalizedOrigins = config.corsOrigins.map((o) => o.replace(/\/+$/, "").trim());
console.log(`[cors] Origins: ${JSON.stringify(config.corsOrigins)} -> normalized: ${JSON.stringify(normalizedOrigins)} | allowAll=${allowAllCors}`);
app.use(
  cors({
    origin: allowAllCors
      ? true
      : (origin, cb) => {
          if (!origin) return cb(null, true);
          const normOrigin = origin.replace(/\/+$/, "").trim();
          // Also allow FRONTEND_URL and PUBLIC_BASE_URL automatically for convenience
          const extraAllowed = [config.frontendUrl, config.publicBaseUrl].map((u) => (u || "").replace(/\/+$/, "").trim()).filter(Boolean);
          const allAllowed = [...normalizedOrigins, ...extraAllowed];
          if (allAllowed.includes(normOrigin)) return cb(null, true);
          console.warn(`[cors] Blocked origin: ${origin} | allowed: ${JSON.stringify(allAllowed)}`);
          // Don't throw — return false so cors still sends headers (browser will block but not as 500)
          return cb(null, false);
        },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-discord-id", "x-discord-secret", "x-bot-token", "x-app-id", "x-appid"],
  })
);
// Capture raw body for any webhook route (needed for HMAC verification)
// before express.json parses it. The per-route express.raw handlers above
// only cover /api/v1/dev/payments/webhook & razorpay — this generic verify
// ensures /webhooks/razorpay, /payments/razorpay/webhook etc. also work.
const captureRawBody = (req, _res, buf) => {
  if (req.originalUrl.includes("webhook") || req.originalUrl.includes("razorpay")) {
    req.rawBody = buf;
  }
};
// Stripe webhook needs the raw body for signature verification (before express.json).
app.post(
  "/api/v1/dev/payments/webhook",
  express.raw({ type: "*/*" }),
  (req, _res, next) => {
    req.rawBody = req.body;
    next();
  }
);
// Razorpay webhook also needs the raw body for signature verification.
app.post(
  "/api/v1/dev/payments/razorpay/webhook",
  express.raw({ type: "*/*" }),
  (req, _res, next) => {
    req.rawBody = req.body;
    next();
  }
);
// Aliases for cleaner dashboard configuration (e.g. /api/v1/webhooks/razorpay)
app.post(
  "/api/v1/webhooks/razorpay",
  express.raw({ type: "*/*" }),
  (req, _res, next) => {
    req.rawBody = req.body;
    next();
  }
);
app.post(
  "/api/v1/payments/razorpay/webhook",
  express.raw({ type: "*/*" }),
  (req, _res, next) => {
    req.rawBody = req.body;
    next();
  }
);
app.use(express.json({ limit: "10mb", verify: captureRawBody }));
app.use(express.urlencoded({ extended: true, limit: "10mb", verify: captureRawBody }));

app.get("/", (req, res) =>
  res.json({
    status: "success",
    name: "AuthLX Security & Authentication API",
    version: "1.0.0",
    documentation: "https://authlx.com/docs",
    health: "/health",
  })
);

app.get("/health", async (req, res) => {
  try {
    const pool = require("./db/pool");
    await pool.query("SELECT 1");
    res.json({ status: "success", database: "connected", api: "connected", uptime: process.uptime() });
  } catch (e) {
    console.error("[health] db check failed:", e.message);
    res.status(503).json({ status: "error", database: "disconnected", api: "connected" });
  }
});

app.use("/api/v1/dev", rateLimitMiddleware(), devRoutes);
app.use("/api/v1/customer", rateLimitMiddleware(clientLimiter), customerRoutes);
app.use("/api/v2/client", rateLimitMiddleware(clientLimiter), clientV2Routes);
app.use("/api/v1/admin", rateLimitMiddleware(), adminRoutes);

app.use("/uploads", express.static(config.uploadsDir, { maxAge: "1d", immutable: false }));

app.use(notFound);
app.use(errorHandler);

module.exports = app;