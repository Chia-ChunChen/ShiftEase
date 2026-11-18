
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");
const Employee = require("./models/Employee");

async function runTests() {
  let testUserId = null;
  const testEmployeeIds = [];

  try {
    await connectDB();

    console.log("\n=== User-Employee Relationship Tests ===");

    // Generate unique test email addresses
    const uniqueId = Date.now();

    const userEmail = `link-user-${uniqueId}@example.com`;

    // Test 1: Create a User and link an Employee
    const user = await User.create({
      name: "Link Test User",
      email: userEmail,
      password: "Test123456!",
      role: "Employee"
    });

    testUserId = user._id;

    const employee = await Employee.create({
      user: user._id,
      name: "Link Test Employee",
      email: `link-employee-${uniqueId}@example.com`,
      phone: "1234567890",
      position: "Cashier"
    });

    testEmployeeIds.push(employee._id);

    console.log("PASS: Employee linked to User");

    // Test 2: Find Employee by User ID
    const foundEmployee = await Employee.findOne({
      user: user._id
    });

    if (!foundEmployee) {
      throw new Error("Employee not found by User ID");
    }

    console.log("PASS: Find Employee by User ID");
    console.log("Employee._id:", foundEmployee._id.toString());

    // Test 3: Populate User information
    const populatedEmployee = await Employee.findById(
      employee._id
    ).populate("user", "name email role");

    if (
      !populatedEmployee.user ||
      populatedEmployee.user.email !== userEmail
    ) {
      throw new Error("Populate User failed");
    }

    console.log("PASS: Populate linked User");

    // Test 4: Existing Employee without User
    const oldEmployee = await Employee.create({
      name: "Legacy Test Employee",
      email: `link-legacy-${uniqueId}@example.com`,
      phone: "1234567890",
      position: "Cashier"
    });

    testEmployeeIds.push(oldEmployee._id);

    console.log("PASS: Employee without User still works");

    // Test 5: Duplicate User linkage
    try {
      const duplicateEmployee = await Employee.create({
        user: user._id,
        name: "Duplicate Link Employee",
        email: `link-duplicate-${uniqueId}@example.com`,
        phone: "1234567890",
        position: "Cashier"
      });

      testEmployeeIds.push(duplicateEmployee._id);

      throw new Error(
        "Duplicate User link was incorrectly allowed"
      );
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      console.log("PASS: Duplicate User link rejected");
    }

    console.log("\nALL TESTS PASSED");
  } catch (error) {
    console.error("\nTEST FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    // Clean up only the test records created here
    if (mongoose.connection.readyState === 1) {
      try {
        if (testEmployeeIds.length > 0) {
          await Employee.deleteMany({
            _id: { $in: testEmployeeIds }
          });
        }

        if (testUserId) {
          await User.deleteOne({ _id: testUserId });
        }

        console.log("PASS: Test data cleaned up");
      } catch (cleanupError) {
        console.error(
          "Cleanup failed:",
          cleanupError.message
        );
        process.exitCode = 1;
      }
    }

    await mongoose.disconnect();
  }
}

runTests();
