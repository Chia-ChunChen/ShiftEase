
require("dotenv").config();

const mongoose = require("mongoose");
const Employee = require("./models/Employee");
const Availability = require("./models/Availability");

const testAvailability = async () => {
  let employeeId = null;
  let availabilityId = null;

  try {
    await require("./config/db")();
    console.log("MongoDB connected successfully");

    const employee = await Employee.create({
      name: "Availability Test Employee",
      email: `availability-${Date.now()}@example.com`,
      phone: "1234567890",
      position: "Cashier"
    });

    employeeId = employee._id;

    const availability = await Availability.create({
      employee: employee._id,
      availableDate: new Date("2026-11-16T12:00:00Z"),
      startTime: "09:00",
      endTime: "17:00"
    });

    availabilityId = availability._id;

    console.log("Availability saved successfully");

    const savedAvailability = await Availability.findById(
      availability._id
    ).populate("employee", "name email position");

    if (!savedAvailability) {
      throw new Error("Availability was not found");
    }

    if (
      savedAvailability.employee._id.toString() !==
      employee._id.toString()
    ) {
      throw new Error("Employee reference is incorrect");
    }

    console.log("Availability retrieved successfully:");
    console.log(savedAvailability);

    console.log("Employee availability verified successfully");

  } catch (error) {
    console.error("Availability test failed:", error.message);
    process.exitCode = 1;

  } finally {
    if (mongoose.connection.readyState === 1) {
      if (availabilityId) {
        await Availability.findByIdAndDelete(availabilityId);
      }

      if (employeeId) {
        await Employee.findByIdAndDelete(employeeId);
      }

      console.log("Test data cleaned up");
    }

    await mongoose.disconnect();
  }
};

testAvailability();
