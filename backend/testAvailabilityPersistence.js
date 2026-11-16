require("dotenv").config();

const mongoose = require("mongoose");
const Availability = require("./models/Availability");
const Employee = require("./models/Employee");
const connectDB = require("./config/db");

async function runTest() {
  let testEmployee = null;
  let testAvailabilityId = null;

  try {
    await connectDB();
    console.log("MongoDB connected.");

    // Test 1: Create a temporary employee
    testEmployee = await Employee.create({
      name: "Availability Persistence Test",
      email: `availability-persistence-${Date.now()}@example.com`,
      phone: "1234567890",
      position: "Cashier"
    });

    console.log("PASS: Temporary employee created.");

    // Test 2: Save availability
    const availability = await Availability.create({
      employee: testEmployee._id,
      availableDate: new Date("2026-11-20T12:00:00.000Z"),
      startTime: "09:00",
      endTime: "17:00"
    });

    testAvailabilityId = availability._id;

    console.log("PASS: Availability saved to MongoDB.");

    // Test 3: Retrieve and verify all fields
    const retrieved = await Availability.findById(
      testAvailabilityId
    ).populate("employee", "name email position");

    if (!retrieved) {
      throw new Error("Availability could not be retrieved.");
    }

    if (
      retrieved.startTime !== "09:00" ||
      retrieved.endTime !== "17:00" ||
      retrieved.availableDate.toISOString() !==
        "2026-11-20T12:00:00.000Z" ||
      retrieved.employee._id.toString() !==
        testEmployee._id.toString()
    ) {
      throw new Error("Retrieved availability data does not match.");
    }

    console.log("PASS: Retrieved availability fields match.");
    console.log("PASS: Employee reference populated correctly.");

    // Test 4: Disconnect and reconnect
    await mongoose.disconnect();
    console.log("MongoDB disconnected.");

    await connectDB();
    console.log("MongoDB reconnected.");

    const afterReconnect = await Availability.findById(
      testAvailabilityId
    );

    if (!afterReconnect) {
      throw new Error("Availability did not persist after reconnecting.");
    }

    if (
      afterReconnect.startTime !== "09:00" ||
      afterReconnect.endTime !== "17:00"
    ) {
      throw new Error("Availability data changed after reconnecting.");
    }

    console.log("PASS: Availability persisted after reconnecting.");

    // Test 5: Reject invalid start time
    let invalidStartRejected = false;

    try {
      await Availability.create({
        employee: testEmployee._id,
        availableDate: new Date("2026-11-21T12:00:00.000Z"),
        startTime: "25:90",
        endTime: "17:00"
      });
    } catch (error) {
      invalidStartRejected = error.name === "ValidationError";
    }

    if (!invalidStartRejected) {
      throw new Error("Invalid start time was not rejected.");
    }

    console.log("PASS: Invalid start time rejected.");

    // Test 6: Reject end time earlier than start time
    let invalidRangeRejected = false;

    try {
      await Availability.create({
        employee: testEmployee._id,
        availableDate: new Date("2026-11-22T12:00:00.000Z"),
        startTime: "17:00",
        endTime: "09:00"
      });
    } catch (error) {
      invalidRangeRejected = error.name === "ValidationError";
    }

    if (!invalidRangeRejected) {
      throw new Error("Invalid time range was not rejected.");
    }

    console.log("PASS: End time earlier than start time rejected.");

    console.log("\nAll Availability persistence tests passed.");
  } catch (error) {
    console.error("\nAvailability persistence test failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      if (testAvailabilityId || testEmployee) {
        if (mongoose.connection.readyState !== 1) {
          await connectDB();
        }

        if (testAvailabilityId) {
          await Availability.findByIdAndDelete(testAvailabilityId);
        }

        if (testEmployee) {
          await Employee.findByIdAndDelete(testEmployee._id);
        }

        console.log("Test data cleaned up.");
      }
    } catch (cleanupError) {
      console.error("Test data cleanup failed:", cleanupError);
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
