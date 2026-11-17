const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const employeeRoutes = require("./routes/employeeRoutes");

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json({ limit: "32kb" }));

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  const origin = req.get("origin");
  if (origin && origin !== frontendOrigin && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    try {
      if (new URL(origin).host === req.get("host")) return next();
    } catch {
      // Invalid origins receive the same response as disallowed origins.
    }
    return res.status(403).json({ message: "This request origin is not allowed." });
  }
  return next();
});

app.get("/api/health", (req, res) => {
  res.json({ message: "ShiftEase API is running." });
});

app.use("/api/users", userRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/employees", employeeRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "API route not found." });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.status === 400) return res.status(400).json({ message: "Invalid JSON request." });
  if (error.status === 413) return res.status(413).json({ message: "Request is too large." });
  console.error("API request failed:", error.name);
  return res.status(500).json({ message: "Unable to complete the request." });
});

module.exports = app;
