const db = require("../models/db");
const { isSecureMode } = require("../utils/appMode");
const {
  validatePassword,
  getPasswordRequirementsMessage
} = require("../utils/passwordPolicy");
const {
  generateSalt,
  buildPasswordHash,
  buildHistoryHash,
  generateResetToken,
  buildTokenHash
} = require("../utils/cryptoUtils");
const { sendRecoveryToken } = require("../utils/mailer");

const GENERIC_LOGIN_ERROR = "Username or password are incorrect.";
const GENERIC_RESET_RESPONSE =
  "If an account with that email exists, a recovery email has been sent.";
const INVALID_TOKEN_MESSAGE = "Invalid or expired token.";
const TOKEN_EXPIRY_MINUTES = 15;

function isValidEmailFormat(rawEmail) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);
}

function renderPage(view, title) {
  return (req, res) => {
    res.render(view, { title });
  };
}

async function register(req, res) {
  const { username, email, password, confirmPassword } = req.body;
  const policy = req.securityConfig.password_policy;
  const hmacSecret = process.env.HMAC_SECRET || req.securityConfig.security_keys.hmac_secret;
  const normalizedEmail = typeof email === "string" ? email.trim() : "";

  if (!username || !normalizedEmail || !password || !confirmPassword) {
    req.session.flashError = "All fields are required.";
    return res.redirect("/register");
  }

  if (!isValidEmailFormat(normalizedEmail)) {
    req.session.flashError = "Email must match name@domain.tld format.";
    return res.redirect("/register");
  }

  if (password !== confirmPassword) {
    req.session.flashError = "Password confirmation does not match.";
    return res.redirect("/register");
  }

  const policyResult = validatePassword(password, policy);
  if (!policyResult.isValid) {
    req.session.flashError = getPasswordRequirementsMessage(policy);
    return res.redirect("/register");
  }

  let existingRows;
  if (isSecureMode(req.appMode)) {
    [existingRows] = await db.execute(
      "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1",
      [username, normalizedEmail]
    );
  } else {
    const lookupSql =
      "SELECT username FROM users WHERE username = '" +
      username +
      "' OR email = '" +
      normalizedEmail +
      "' LIMIT 1";
    [existingRows] = await db.query(lookupSql);
    console.log("SQL Lookup Executed: " + lookupSql);
  }

  if (existingRows.length > 0) {
    if (isSecureMode(req.appMode)) {
    req.session.flashError = "Registration failed. Please verify your details.";
    } else {
      const foundValue = existingRows[0].username || "Record";
      req.session.flashError = `Registration failed. '${foundValue}' is already in use.`;
    }
    return res.redirect("/register");
  }

  const salt = generateSalt();
  const passwordHash = buildPasswordHash(password, salt, hmacSecret);
  const historyHash = buildHistoryHash(password, hmacSecret);

  let insertResult;
  if (isSecureMode(req.appMode)) {
    [insertResult] = await db.execute(
      "INSERT INTO users (username, email, password_hash, salt, failed_attempts, lockout_until) VALUES (?, ?, ?, ?, 0, NULL)",
      [username, normalizedEmail, passwordHash, salt]
    );
  } else {
    const insertSql =
      "INSERT INTO users (username, email, password_hash, salt, failed_attempts, lockout_until) VALUES ('" +
      username +
      "', '" +
      normalizedEmail +
      "', '" +
      passwordHash +
      "', '" +
      salt +
      "', 0, NULL)";
    [insertResult] = await db.query(insertSql);
  }

  if (isSecureMode(req.appMode)) {
    await db.execute(
      "INSERT INTO password_history (user_id, password_hash, created_at) VALUES (?, ?, NOW())",
      [insertResult.insertId, historyHash]
    );
  } else {
    const historySql =
      "INSERT INTO password_history (user_id, password_hash, created_at) VALUES (" +
      insertResult.insertId +
      ", '" +
      historyHash +
      "', NOW())";
    await db.query(historySql);
  }

  return res.redirect("/login");
}

async function login(req, res) {
  const { username, password } = req.body;
  const hmacSecret = process.env.HMAC_SECRET || req.securityConfig.security_keys.hmac_secret;
  const lockout = req.securityConfig.lockout_policy;

  // 1. ולידציה בסיסית של קלט
  if (!username || !password) {
    req.session.flashError = "Please enter both username and password.";
    return res.redirect("/login");
  }

  let user;

  // --- שלב א: שליפת המשתמש ואימות ---
  
  if (isSecureMode(req.appMode)) {
    /** 
     * מצב מאובטח (V2): 
     * משתמשים ב-Prepared Statements למניעת SQLi.
     * אימות הסיסמה מתבצע בנפרד בתוך הקוד באמצעות HMAC.
     */
    const [rows] = await db.execute("SELECT * FROM users WHERE username = ? LIMIT 1", [username]);
    user = rows[0];

    // בדיקה אם המשתמש קיים ואם ה-Hash של הסיסמה תואם
    if (!user || buildPasswordHash(password, user.salt, hmacSecret) !== user.password_hash) {
      // אם האימות נכשל, נטפל בזה בשלב הנעילה בהמשך
      return handleFailedLogin(req, res, user, lockout);
    }
  } else {
    /** 
     * מצב פגיע (V1): 
     * שרשור מחרוזות ישיר המאפשר SQL Injection.
     */
    let passwordHash = "";
    const [salt_rows] = (await db.execute("SELECT salt FROM users WHERE username = ? LIMIT 1", [username]));
    const user_salt = salt_rows[0] ? salt_rows[0].salt : null;
    if (user_salt) {
        passwordHash = buildPasswordHash(password, user_salt, hmacSecret);
    }
    const sql = "SELECT * FROM users WHERE username = '" + username + "' AND password_hash = '" + passwordHash + "' LIMIT 1";
  
    const [rows] = await db.query(sql);
    user = rows[0];

    // אם ה-SQL הזרקתי החזיר שורה, אנחנו "בפנים" מבלי לבדוק HMAC בנפרד
    if (!user) {
      const [rows] = await db.execute("SELECT * FROM users WHERE username = ? LIMIT 1", [username]);
      user = rows[0];
      req.session.flashError = "Invalid username or password.";
      return handleFailedLogin(req, res, user, lockout);
    }
  }

  // --- שלב ב: בדיקת נעילה (Lockout) ---
  if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
    req.session.flashError = "Account is temporarily locked. Try again later.";
    return res.redirect("/login");
  }

  // --- שלב ג: הצלחה - איפוס מונים ויצירת סשן ---

  if (isSecureMode(req.appMode)) {
    await db.execute("UPDATE users SET failed_attempts = 0, lockout_until = NULL WHERE id = ?", [user.id]);
  } else {
    // עדכון פגיע ב-V1
    await db.query("UPDATE users SET failed_attempts = 0, lockout_until = NULL WHERE id = " + user.id);
  }

  // יצירת סשן מאובטח
  req.session.regenerate((err) => {
    if (err) {
      req.session.flashError = "Session error. Please try again.";
      return res.redirect("/login");
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };
    return res.redirect("/dashboard");
  });
}

/**
 * פונקציית עזר לניהול נסיונות כושלים ונעילה
 */
async function handleFailedLogin(req, res, user, lockout) {
  if (!user) {
    req.session.flashError = "Invalid username or password.";
    return res.redirect("/login");
  }

  const attempts = (user.failed_attempts || 0) + 1;
  const maxAttempts = lockout.max_attempts || 3;

  if (attempts >= maxAttempts) {
    const lockMinutes = lockout.lockout_duration_minutes || 30;
    if (isSecureMode(req.appMode)) {
      await db.execute(
        "UPDATE users SET failed_attempts = ?, lockout_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?",
        [attempts, lockMinutes, user.id]
      );
    } else {
      await db.query(
        "UPDATE users SET failed_attempts = " + attempts + 
        ", lockout_until = DATE_ADD(NOW(), INTERVAL " + lockMinutes + " MINUTE) WHERE id = " + user.id
      );
    }
    req.session.flashError = "Account locked due to too many failed attempts.";
  } else {
    if (isSecureMode(req.appMode)) {
      await db.execute("UPDATE users SET failed_attempts = ? WHERE id = ?", [attempts, user.id]);
    } else {
      await db.query("UPDATE users SET failed_attempts = " + attempts + " WHERE id = " + user.id);
    }
    req.session.flashError = "Invalid username or password.";
  }
  
  return res.redirect("/login");
}


function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("com_ltd.sid");
    res.redirect("/login");
  });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.session.user.id;
  const policy = req.securityConfig.password_policy;
  const hmacSecret = process.env.HMAC_SECRET || req.securityConfig.security_keys.hmac_secret;
  const parsedHistoryLimit = Number(policy.history_limit);
  const historyLimit =
    Number.isInteger(parsedHistoryLimit) && parsedHistoryLimit > 0 ? parsedHistoryLimit : 3;

  if (!currentPassword || !newPassword || !confirmPassword) {
    req.session.flashError = "All fields are required.";
    return res.redirect("/change-password");
  }

  if (newPassword !== confirmPassword) {
    req.session.flashError = "Password confirmation does not match.";
    return res.redirect("/change-password");
  }

  const [users] = await db.execute("SELECT id, password_hash, salt FROM users WHERE id = ? LIMIT 1", [userId]);
  const user = users[0];

  if (!user) {
    req.session.flashError = "Please sign in to continue.";
    return res.redirect("/login");
  }

  const currentHash = buildPasswordHash(currentPassword, user.salt, hmacSecret);
  if (currentHash !== user.password_hash) {
    req.session.flashError = "Current password is incorrect.";
    return res.redirect("/change-password");
  }

  const policyResult = validatePassword(newPassword, policy);
  if (!policyResult.isValid) {
    req.session.flashError = getPasswordRequirementsMessage(policy);
    return res.redirect("/change-password");
  }

  const newHistoryHash = buildHistoryHash(newPassword, hmacSecret);
  const [historyRows] = await db.execute(
    `SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ${historyLimit}`,
    [userId]
  );

  const isReused = historyRows.some((row) => row.password_hash === newHistoryHash);
  if (isReused) {
    req.session.flashError = "New password cannot match your recent passwords.";
    return res.redirect("/change-password");
  }

  const newSalt = generateSalt();
  const newStoredHash = buildPasswordHash(newPassword, newSalt, hmacSecret);

  await db.execute("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", [
    newStoredHash,
    newSalt,
    userId
  ]);
  await db.execute(
    "INSERT INTO password_history (user_id, password_hash, created_at) VALUES (?, ?, NOW())",
    [userId, newHistoryHash]
  );

  return res.redirect("/change-password");
}

async function requestPasswordReset(req, res) {
  const { email } = req.body;

  if (!email) {
    req.session.flashError = "Email is required.";
    return res.redirect("/forgot-password");
  }

  const [rows] = await db.execute("SELECT id, email FROM users WHERE email = ? LIMIT 1", [email]);
  const user = rows[0];

  if (!user) {
    req.session.flashError = "Email not found.";
    return res.redirect("/forgot-password");
  }

  const token = generateResetToken();
  const tokenHash = buildTokenHash(token);

  await db.execute("UPDATE password_resets SET is_used = 1 WHERE user_id = ? AND is_used = 0", [user.id]);

  await db.execute(
    "INSERT INTO password_resets (user_id, token_hash, expires_at, is_used) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), 0)",
    [user.id, tokenHash, TOKEN_EXPIRY_MINUTES]
  );

  try {
    await sendRecoveryToken(user.email, token);
  } catch (mailErr) {
    console.error("Failed to send recovery email:", mailErr);
  }

  return res.redirect("/verify-token");
}

async function verifyResetToken(req, res) {
  const { email, token } = req.body;

  if (!email || !token) {
    req.session.flashError = INVALID_TOKEN_MESSAGE;
    return res.redirect("/verify-token");
  }

  const [users] = await db.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  const user = users[0];
  if (!user) {
    req.session.flashError = INVALID_TOKEN_MESSAGE;
    return res.redirect("/verify-token");
  }

  const tokenHash = buildTokenHash(token);
  const [rows] = await db.execute(
    "SELECT id FROM password_resets WHERE user_id = ? AND token_hash = ? AND is_used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
    [user.id, tokenHash]
  );

  const resetRow = rows[0];
  if (!resetRow) {
    req.session.flashError = INVALID_TOKEN_MESSAGE;
    return res.redirect("/verify-token");
  }

  await db.execute("UPDATE password_resets SET is_used = 1 WHERE id = ?", [resetRow.id]);

  req.session.resetUserId = user.id;
  return res.redirect("/reset-password");
}

async function resetPassword(req, res) {
  const { newPassword, confirmPassword } = req.body;
  const userId = req.session.resetUserId;
  const policy = req.securityConfig.password_policy;
  const hmacSecret = process.env.HMAC_SECRET || req.securityConfig.security_keys.hmac_secret;

  if (!userId) {
    req.session.flashError = INVALID_TOKEN_MESSAGE;
    return res.redirect("/verify-token");
  }

  if (!newPassword || !confirmPassword) {
    req.session.flashError = "All fields are required.";
    return res.redirect("/reset-password");
  }

  if (newPassword !== confirmPassword) {
    req.session.flashError = "Password confirmation does not match.";
    return res.redirect("/reset-password");
  }

  const policyResult = validatePassword(newPassword, policy);
  if (!policyResult.isValid) {
    req.session.flashError = getPasswordRequirementsMessage(policy);
    return res.redirect("/reset-password");
  }

  const newSalt = generateSalt();
  const newStoredHash = buildPasswordHash(newPassword, newSalt, hmacSecret);
  const historyHash = buildHistoryHash(newPassword, hmacSecret);

  await db.execute("UPDATE users SET password_hash = ?, salt = ?, failed_attempts = 0, lockout_until = NULL WHERE id = ?", [
    newStoredHash,
    newSalt,
    userId
  ]);
  await db.execute(
    "INSERT INTO password_history (user_id, password_hash, created_at) VALUES (?, ?, NOW())",
    [userId, historyHash]
  );

  delete req.session.resetUserId;
  return res.redirect("/login");
}

module.exports = {
  showLogin: renderPage("login", "Login"),
  showRegister: renderPage("register", "Register"),
  showForgotPassword: renderPage("forgot-password", "Forgot Password"),
  showVerifyToken: renderPage("verify-token", "Verify Token"),
  showResetPassword: renderPage("reset-password", "Reset Password"),
  showChangePassword: renderPage("change-password", "Change Password"),
  register,
  login,
  logout,
  changePassword,
  requestPasswordReset,
  verifyResetToken,
  resetPassword
};
