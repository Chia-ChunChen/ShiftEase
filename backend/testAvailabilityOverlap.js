
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Employee = require("./models/Employee");
const Availability = require("./models/Availability");
const { createAvailability } = require("./services/availabilityService");

async function runTest() {
  let employeeId;

  try {
    await connectDB();

    const employee = await Employee.create({
      name: "Overlap Test Employee",
      email: `overlap-${Date.now()}@example.com`,
      phone: "1234567890",
      position: "Cashier"
    });

    employeeId = employee._id;

    const data = {
      employee: employeeId,
      availableDate: "2026-11-16"
    };

    // Test 1: Normal availability
    await createAvailability({
      ...data,
      startTime: "09:00",
      endTime: "12:00"
    });
    console.log("PASS: First availability saved");

    // Test 2: Overlapping availability
    try {
      await createAvailability({
        ...data,
        startTime: "11:00",
        endTime: "14:00"
      });

      throw new Error("Overlapping availability was accepted");
    } catch (error) {
      if (error.code !== "OVERLAPPING_AVAILABILITY") {
        throw error;
      }
      console.log("PASS: Overlapping hours rejected");
    }

    // Test 3: Non-overlapping availability
    await createAvailability({
      ...data,
      startTime: "12:00",
      endTime: "16:00"
    });
    console.log("PASS: Non-overlapping hours saved");

    const count = await Availability.countDocuments({
      employee: employeeId
    });

    if (count !== 2) {
      throw new Error(`Expected 2 records, found ${count}`);
    }

    console.log("PASS: Database contains 2 valid records");
    console.log("All overlap tests passed!");

  } catch (error) {
    console.error("TEST FAILED:", error.message);
    process.exitCode = 1;

  } finally {
    if (mongoose.connection.readyState === 1) {
      if (employeeId) {
        await Availability.deleteMany({ employee: employeeId });
        await Employee.findByIdAndDelete(employeeId);
      }

      await mongoose.disconnect();
    }
  }
}

runTest();
