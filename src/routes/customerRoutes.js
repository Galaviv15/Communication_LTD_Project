const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
	showDashboard,
	createCustomer,
	deleteCustomer,
	updateAppMode
} = require("../controllers/customerController");

const router = express.Router();

router.get("/dashboard", requireAuth, showDashboard);
router.post("/customers", requireAuth, createCustomer);
router.post("/customers/:id/delete", requireAuth, deleteCustomer);
router.post("/app-mode", updateAppMode);

module.exports = router;
