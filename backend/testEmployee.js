
require("dotenv").config();

const mongoose = require("mongoose");
const Employee = require("./models/Employee");

const testEmployee = async () => {
  try {
    await require("./config/db")();
    console.log("MongoDB connected successfully");

    // Create employee
    const employee = await Employee.create({
      name: "Test Employee",
      email: `test-${Date.now()}@example.com`,
      phone: "1234567890",
      position: "Cashier"
    });

    console.log("Employee saved successfully:");
    console.log(employee);

    // Retrieve the employee from MongoDB
    const savedEmployee = await Employee.findById(employee._id);

    console.log("Employee retrieved successfully:");
    console.log(savedEmployee);

    // Clean up the test data
    await Employee.findByIdAndDelete(employee._id);
    console.log("Test employee deleted successfully");

  } catch (error) {
    console.error("Database test failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

testEmployee();
