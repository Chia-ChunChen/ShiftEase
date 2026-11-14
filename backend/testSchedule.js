
require("dotenv").config();

const mongoose = require("mongoose");
const Employee = require("./models/Employee");
const Schedule = require("./models/Schedule");

const testSchedule = async () => {
  let testEmployeeId = null;
  let testScheduleId = null;

  try {
    await require("./config/db")();
    console.log("MongoDB connected successfully");

    // 1. Create a temporary employee
    const employee = await Employee.create({
      name: "Schedule Test Employee",
      email: `schedule-test-${Date.now()}@example.com`,
      phone: "1234567890",
      position: "Cashier"
    });

    testEmployeeId = employee._id;

    console.log("Test employee created successfully");

    // 2. Create a schedule and assign the employee
    const schedule = await Schedule.create({
      shiftDate: new Date("2026-11-15T12:00:00Z"),
      startTime: "09:00",
      endTime: "17:00",
      employees: [employee._id]
    });

    testScheduleId = schedule._id;

    console.log("Schedule saved successfully:");
    console.log(schedule);

    // 3. Retrieve the saved schedule with employee details
    const savedSchedule = await Schedule.findById(
      schedule._id
    ).populate("employees", "name email position");

    if (!savedSchedule) {
      throw new Error("Schedule was not found");
    }

    if (
      savedSchedule.employees.length !== 1 ||
      savedSchedule.employees[0]._id.toString() !==
        employee._id.toString()
    ) {
      throw new Error("Employee assignment was not saved correctly");
    }

    console.log("Schedule retrieved successfully:");
    console.log(savedSchedule);

    console.log("Employee assignment verified successfully");

  } catch (error) {
    console.error("Schedule test failed:", error.message);
    process.exitCode = 1;

  } finally {
    // Clean up only records created by this test
    if (mongoose.connection.readyState === 1) {
      if (testScheduleId) {
        await Schedule.findByIdAndDelete(testScheduleId);
      }

      if (testEmployeeId) {
        await Employee.findByIdAndDelete(testEmployeeId);
      }

      console.log("Test data cleaned up");
    }

    await mongoose.disconnect();
  }
};

testSchedule();
