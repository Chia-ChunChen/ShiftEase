require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { createUser, findUserById, verifyPassword } = require("./services/userService");
const User = require("./models/User");
const connectDB = require("./config/db");

async function runTest() {
  let createdUserId = null;
  let testEmail = `user-persistence-${Date.now()}@example.com`;

  try {
    await connectDB();
    console.log("MongoDB connected.");

    // Test 1: Create and save a new user
    const plainPassword = "TestPass123";

    const createdUser = await createUser({
      name: "Persistence Test User",
      email: testEmail,
      password: plainPassword,
      role: "Employee"
    });

    createdUserId = createdUser._id;
    console.log("PASS: User created and saved.");

    // Password must not be returned
    if (createdUser.password !== undefined) {
      throw new Error("Password was exposed in the returned user.");
    }
    console.log("PASS: Returned user does not expose password.");

    // Test 2: Disconnect and reconnect to verify persistence
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");

    await connectDB();
    console.log("MongoDB reconnected.");

    const retrievedUser = await findUserById(createdUserId);

    if (!retrievedUser) {
      throw new Error("Saved user could not be retrieved.");
    }

    if (
      retrievedUser.name !== "Persistence Test User" ||
      retrievedUser.email !== testEmail.toLowerCase() ||
      retrievedUser.role !== "Employee"
    ) {
      throw new Error("Retrieved user information does not match.");
    }

    console.log("PASS: User information persisted after reconnecting.");

    // Test 3: Verify stored password is hashed
    const storedUser = await User.findById(createdUserId).select("+password");

    if (!storedUser || storedUser.password === plainPassword) {
      throw new Error("Password was not stored as a hash.");
    }

    if (!(await bcrypt.compare(plainPassword, storedUser.password))) {
      throw new Error("Stored password hash does not match original password.");
    }

    console.log("PASS: Password is hashed and can be verified.");

    // Test 4: Verify password login check
    const passwordValid = await verifyPassword(testEmail, plainPassword);

    if (!passwordValid) {
      throw new Error("Password verification failed.");
    }

    console.log("PASS: Password verification works.");

    // Test 5: Reject duplicate email
    let duplicateRejected = false;

    try {
      await createUser({
        name: "Duplicate Test User",
        email: testEmail,
        password: plainPassword,
        role: "Employee"
      });
    } catch (error) {
      if (error.code === "DUPLICATE_EMAIL") {
        duplicateRejected = true;
      } else {
        throw error;
      }
    }

    if (!duplicateRejected) {
      throw new Error("Duplicate email was not rejected.");
    }

    console.log("PASS: Duplicate email was rejected.");

    console.log("\nAll User persistence tests passed.");
  } catch (error) {
    console.error("\nUser persistence test failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      if (createdUserId) {
        if (mongoose.connection.readyState !== 1) {
          await connectDB();
        }

        await User.findByIdAndDelete(createdUserId);
        console.log("Test user cleaned up.");
      }
    } catch (cleanupError) {
      console.error("Test user cleanup failed:", cleanupError);
      process.exitCode = 1;
    } finally {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        console.log("MongoDB disconnected.");
      }
    }
  }
}

runTest();
