
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const administratorRoutes = require("./routes/administratorRoutes");

const app = express();

app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "ShiftEase API is running."
  });
});

app.use("/api/users", userRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/admin", administratorRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`ShiftEase API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
