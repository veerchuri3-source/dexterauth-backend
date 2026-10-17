const crypto = require("crypto");
const { rid, clamp } = require("../utils/helpers");

const CHARS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  capital: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
};

/**
 * Generate license keys from a mask.
 * Mask chars:
 *   X  -> random (per lowercaseLetters / capitalLetters flags)
 *   #  -> random digit
 *   A  -> random uppercase letter
 *   a  -> random lowercase letter
 *   anything else -> literal
 * Default mask example: "AUTH-XXXX-XXXX"
 */
function generateKeys({
  amount = 1,
  mask = "AUTH-XXXX-XXXX",
  lowercaseLetters = false,
  capitalLetters = true,
  existing = [],
}) {
  const keys = new Set(existing);
  const used = new Set(existing);
  const out = [];
  let attempts = 0;
  const pool = (lowercaseLetters ? CHARS.lowercase : "") + (capitalLetters ? CHARS.capital : "") + CHARS.numbers;
  while (out.length < amount && attempts < amount * 500) {
    attempts++;
    let key = "";
    for (const ch of mask) {
      if (ch === "X") key += pool ? pool[crypto.randomInt(pool.length)] : CHARS.numbers[crypto.randomInt(10)];
      else if (ch === "#") key += CHARS.numbers[crypto.randomInt(10)];
      else if (ch === "A") key += CHARS.capital[crypto.randomInt(26)];
      else if (ch === "a") key += CHARS.lowercase[crypto.randomInt(26)];
      else key += ch;
    }
    if (used.has(key)) continue;
    used.add(key);
    keys.add(key);
    out.push(key);
  }
  return out;
}

function generateSessionToken() {
  return "st_" + crypto.randomBytes(24).toString("hex");
}

function generateAppToken() {
  return "authlx_" + crypto.randomBytes(12).toString("hex");
}

function generateAppSecret() {
  return "sk_" + crypto.randomBytes(14).toString("hex");
}

function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function generateOtp() {
  const code = String(crypto.randomInt(100000, 1000000));
  return { code, hash: hashOtp(code) };
}

module.exports = { generateKeys, generateSessionToken, generateAppToken, generateAppSecret, generateOtp, hashOtp, clamp };