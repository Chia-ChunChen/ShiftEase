require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    const server = await new Promise((resolve, reject) => {
      const listener = app.listen(PORT);
      listener.once("error", reject);
      listener.once("listening", () => resolve(listener));
    });
    console.log(`ShiftEase API running on port ${server.address().port}`);
  } catch (error) {
    if (error.code === "EADDRINUSE") {
      console.error(`Server startup failed: port ${PORT} is already in use. Stop the existing backend before restarting.`);
    } else {
      console.error("Server startup failed:", error.message);
    }
    await mongoose.disconnect();
    process.exitCode = 1;
  }
}

startServer();
