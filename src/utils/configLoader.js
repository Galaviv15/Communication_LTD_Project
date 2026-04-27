const fs = require("fs");

function loadConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("config.json not found");
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!parsed.password_policy || !parsed.lockout_policy) {
    throw new Error("config.json is missing required policy sections");
  }

  return parsed;
}

module.exports = {
  loadConfig
};
