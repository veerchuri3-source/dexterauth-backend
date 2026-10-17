/**
 * SRP (Signed Response Protocol) — server side.
 * Mirrors DexterAuth C# SDK `SimpleJson.SerializeCanonical` + `compute_auth_seal`
 * so the SDK's strict signature check passes:
 *
 *   payload       = canonicalJson(body) + ":" + nonce
 *   X-Response-Sig   = HMAC_SHA256(api_secret, payload) hex lowercase
 *   X-Response-Nonce = 32-char hex nonce
 *
 * Canonical form MUST match C# exactly:
 *  - object keys sorted ordinally, {"k":v,...} with no spaces
 *  - strings escaped as: \" \\ \n \r \t, other chars < 0x20 as \u00xx (lowercase)
 *  - true/false/null lowercase, integers plain, Dates as ISO-8601 strings
 */
const crypto = require("crypto");

function escStr(s) {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const code = s.charCodeAt(i);
    if (c === '"') out += '\\"';
    else if (c === "\\") out += "\\\\";
    else if (c === "\n") out += "\\n";
    else if (c === "\r") out += "\\r";
    else if (c === "\t") out += "\\t";
    else if (code < 0x20) out += "\\u" + code.toString(16).padStart(4, "0");
    else out += c;
  }
  return out + '"';
}

function canonical(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return escStr(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "null";
    // Whole numbers serialize plain (C# long/double "1" == JS "1").
    return Number.isInteger(v) ? String(v) : String(v);
  }
  if (v instanceof Date) return escStr(v.toISOString());
  if (Buffer.isBuffer(v)) return escStr(v.toString("utf8"));
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (typeof v === "object") {
    const keys = Object.keys(v).sort(); // ordinal for ASCII keys, like StringComparer.Ordinal
    return "{" + keys.map((k) => escStr(k) + ":" + canonical(v[k])).join(",") + "}";
  }
  return escStr(String(v));
}

function signBody(secret, body) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = canonical(body) + ":" + nonce;
  const sig = crypto.createHmac("sha256", String(secret)).update(payload, "utf8").digest("hex");
  return { sig, nonce };
}

module.exports = { canonical, signBody };
