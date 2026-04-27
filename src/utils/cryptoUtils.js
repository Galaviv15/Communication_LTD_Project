const crypto = require("crypto");

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function buildPasswordHash(password, salt, secret) {
  return crypto
    .createHmac("sha256", `${secret}:${salt}`)
    .update(password)
    .digest("hex");
}

function buildHistoryHash(password, secret) {
  return crypto
    .createHmac("sha256", `history:${secret}`)
    .update(password)
    .digest("hex");
}

function generateResetToken() {
  return crypto.randomBytes(24).toString("hex");
}

function buildTokenHash(token) {
  return crypto.createHash("sha1").update(token).digest("hex");
}

module.exports = {
  generateSalt,
  buildPasswordHash,
  buildHistoryHash,
  generateResetToken,
  buildTokenHash
};
