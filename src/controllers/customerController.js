const db = require("../models/db");
const { isSecureMode, setCurrentAppMode } = require("../utils/appMode");

async function showDashboard(req, res) {
  let customers;

  if (isSecureMode(req.appMode)) {
    [customers] = await db.execute(
      "SELECT id, customer_name, sector, created_at FROM customers ORDER BY created_at DESC"
    );
  } else {
    [customers] = await db.query(
      "SELECT id, customer_name, sector, created_at FROM customers ORDER BY created_at DESC"
    );
  }

  res.render("dashboard", {
    title: "Dashboard",
    customers
  });
}

async function createCustomer(req, res) {
  const { customerName, sector } = req.body;

  if (!customerName || !sector) {
    req.session.flashError = "Customer name and sector are required.";
    return res.redirect("/dashboard");
  }

  if (isSecureMode(req.appMode)) {
    await db.execute("INSERT INTO customers (customer_name, sector, created_at) VALUES (?, ?, NOW())", [
      customerName,
      sector
    ]);
  } else {
    const sql =
      "INSERT INTO customers (customer_name, sector, created_at) VALUES ('" +
      customerName +
      "', '" +
      sector +
      "', NOW())";
    await db.query(sql);
  }

  return res.redirect("/dashboard");
}

async function deleteCustomer(req, res) {
  const { id } = req.params;

  if (!id) {
    req.session.flashError = "Customer id is required.";
    return res.redirect("/dashboard");
  }

  if (isSecureMode(req.appMode)) {
    await db.execute("DELETE FROM customers WHERE id = ?", [id]);
  } else {
    const sql = "DELETE FROM customers WHERE id = " + id;
    await db.query(sql);
  }

  return res.redirect("/dashboard");
}

function updateAppMode(req, res) {
  const { appMode } = req.body;
  const fallbackRedirect = req.get("referer") || "/dashboard";

  try {
    const appliedMode = setCurrentAppMode(appMode);
    setCurrentAppMode(appMode);
  } catch (error) {
    req.session.flashError = "Invalid mode selection.";
  }

  return res.redirect(fallbackRedirect);
}

module.exports = {
  showDashboard,
  createCustomer,
  deleteCustomer,
  updateAppMode
};
