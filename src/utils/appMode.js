function validateMode(rawMode) {
  if (rawMode !== "secure" && rawMode !== "vulnerable") {
    throw new Error("Invalid APP_MODE. Allowed values: vulnerable, secure.");
  }

  return rawMode;
}

let currentMode = null;

function initializeAppMode(rawMode) {
  currentMode = validateMode(rawMode);
  return currentMode;
}

function getCurrentAppMode() {
  if (!currentMode) {
    throw new Error("Application mode was not initialized.");
  }

  return currentMode;
}

function setCurrentAppMode(rawMode) {
  currentMode = validateMode(rawMode);
  return currentMode;
}

function isSecureMode(mode) {
  return mode === "secure";
}

module.exports = {
  initializeAppMode,
  getCurrentAppMode,
  setCurrentAppMode,
  isSecureMode
};
