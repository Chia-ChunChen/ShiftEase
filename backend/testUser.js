
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("./models/User");

const testUser = async () => {
  let testUserId = null;

  try {
    await require("./config/db")();

    console.log("MongoDB connected successfully");

    const user = await User.create({
      name: "Test Manager",
      email: `manager-${Date.now()}@example.com`,
      password: "TEST_ONLY_NOT_A_REAL_HASH",
      role: "Manager"
    });

    testUserId = user._id;

    console.log("Test user saved successfully");

    const savedUser = await User.findById(user._id);

    if (!savedUser) {
      throw new Error("User not found");
    }

    if (savedUser.password !== undefined) {
      throw new Error("Password should not be returned");
    }

    console.log("User retrieved successfully:");
    console.log(savedUser);

  } catch (error) {
    console.error("User database test failed:", error.message);
    process.exitCode = 1;

  } finally {
    if (
      mongoose.connection.readyState === 1 &&
      testUserId
    ) {
      await User.findByIdAndDelete(testUserId);
      console.log("Test user deleted successfully");
    }

    await mongoose.disconnect();
  }
};

testUser();
