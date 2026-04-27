const express = require("express");
const {
  showLogin,
  showRegister,
  showForgotPassword,
  showVerifyToken,
  showResetPassword,
  showChangePassword,
  register,
  login,
  logout,
  changePassword,
  requestPasswordReset,
  verifyResetToken,
  resetPassword
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/login", showLogin);
router.post("/login", login);

router.get("/register", showRegister);
router.post("/register", register);

router.post("/logout", logout);

router.get("/forgot-password", showForgotPassword);
router.post("/forgot-password", requestPasswordReset);

router.get("/verify-token", showVerifyToken);
router.post("/verify-token", verifyResetToken);

router.get("/reset-password", showResetPassword);
router.post("/reset-password", resetPassword);

router.get("/change-password", requireAuth, showChangePassword);
router.post("/change-password", requireAuth, changePassword);

module.exports = router;
