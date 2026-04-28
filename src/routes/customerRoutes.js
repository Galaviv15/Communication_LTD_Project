const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
	showDashboard,
	createCustomer,
	updateAppMode
} = require("../controllers/customerController");

const router = express.Router();

router.get("/dashboard", requireAuth, showDashboard);
router.post("/customers", requireAuth, createCustomer);
router.post("/app-mode", updateAppMode);

module.exports = router;
