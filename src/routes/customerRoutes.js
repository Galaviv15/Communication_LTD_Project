const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
	showDashboard,
	createCustomer,
	deleteCustomer,
	searchCustomers,
	updateAppMode
} = require("../controllers/customerController");

const router = express.Router();

router.get("/dashboard", requireAuth, showDashboard);
router.post("/customers", requireAuth, createCustomer);
router.get("/customers/search", requireAuth, searchCustomers);
router.post("/customers/:id/delete", requireAuth, deleteCustomer);
router.post("/app-mode", updateAppMode);

module.exports = router;
