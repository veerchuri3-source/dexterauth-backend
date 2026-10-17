const jwt = require("jsonwebtoken");
const config = require("../config");
const { rid } = require("../utils/helpers");

function signToken(user, sessionId) {
  const jti = rid("jti");
  return {
    jti,
    token: jwt.sign(
      { sub: user.id, role: user.role, jti, tokv: user.token_version || 0 },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
        issuer: config.jwt.issuer,
        audience: "authlx-dashboard",
      }
    ),
  };
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: "authlx-dashboard",
    });
  } catch {
    return null;
  }
}

module.exports = { signToken, verifyToken };