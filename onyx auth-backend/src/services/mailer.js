const nodemailer = require("nodemailer");
const config = require("../config");

let transporter = null;
if (config.mail.enabled && config.mail.host) {
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.secure,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
  });
}

/**
 * Send an email. Falls back to console logging when SMTP is not configured,
 * so development flows (OTP registration, password reset) still work.
 */
async function sendEmail(to, subject, html) {
  if (!transporter) {
    const plain = (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    console.log(`[mailer:dev] TO=${to} SUBJECT="${subject}" BODY="${plain}"`);
    return { dev: true };
  }
  try {
    return await transporter.sendMail({ from: config.mail.from, to, subject, html });
  } catch (e) {
    console.error("[mailer] failed to send:", e.message);
    throw e;
  }
}

async function sendOtp(to, code) {
  return sendEmail(
    to,
    "Your AuthLX verification code",
    `<p>Your verification code is:</p><h2>${code}</h2><p>It expires in ${Math.floor(config.otp.ttlSeconds / 60)} minutes.</p>`
  );
}

module.exports = { sendEmail, sendOtp };