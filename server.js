require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");

const { loadConfig } = require("./src/utils/configLoader");
const { initializeAppMode, getCurrentAppMode } = require("./src/utils/appMode");
const { attachCurrentUser } = require("./src/middleware/authMiddleware");

const authRoutes = require("./src/routes/authRoutes");
const customerRoutes = require("./src/routes/customerRoutes");

const app = express();
const config = loadConfig(path.join(__dirname, "config.json"));
initializeAppMode(process.env.APP_MODE);

const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 3000);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    name: "com_ltd.sid",
    secret: process.env.SESSION_SECRET || "change-me-in-env",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 30 * 60 * 1000
    }
  })
);

app.use((req, res, next) => {
  req.securityConfig = config;
  req.appMode = getCurrentAppMode();
  res.locals.appMode = req.appMode;
  next();
});

app.use(attachCurrentUser);

app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  return res.redirect("/login");
});

app.use(authRoutes);
app.use(customerRoutes);

app.use((req, res) => {
  res.status(404).render("error", {
    title: "Page Not Found",
    message: "The page you requested does not exist."
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).render("error", {
    title: "Server Error",
    message: "An unexpected error occurred. Please try again."
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port} in ${getCurrentAppMode()} mode`);
});
