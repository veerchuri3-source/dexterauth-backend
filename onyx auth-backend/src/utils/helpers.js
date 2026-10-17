const crypto = require("crypto");

const rid = (prefix, len = 8) =>
  `${prefix}_${crypto.randomBytes(len).toString("hex")}`;

const randSecret = (bytes = 18) => crypto.randomBytes(bytes).toString("hex");

const nowSec = () => Math.floor(Date.now() / 1000);

const isoNow = () => new Date().toISOString();

const parseBool = (v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "boolean") return v;
  return String(v).toLowerCase() === "true" || v === 1 || v === "1";
};

const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

module.exports = { rid, randSecret, nowSec, isoNow, parseBool, clamp };