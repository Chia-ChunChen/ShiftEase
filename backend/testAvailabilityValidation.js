const mongoose = require("mongoose");
const Availability = require("./models/Availability");

const testCases = [
  {
    name: "Valid working hours",
    startTime: "09:00",
    endTime: "17:00",
    expectedErrorPath: null
  },
  {
    name: "Invalid start time",
    startTime: "25:90",
    endTime: "17:00",
    expectedErrorPath: "startTime"
  },
  {
    name: "Invalid end time",
    startTime: "09:00",
    endTime: "25:90",
    expectedErrorPath: "endTime"
  },
  {
    name: "End time earlier than start time",
    startTime: "17:00",
    endTime: "09:00",
    expectedErrorPath: "endTime"
  },
  {
    name: "End time equal to start time",
    startTime: "09:00",
    endTime: "09:00",
    expectedErrorPath: "endTime"
  },
  {
    name: "Midnight is a valid start time",
    startTime: "00:00",
    endTime: "08:00",
    expectedErrorPath: null
  },
  {
    name: "24:00 is an invalid start time",
    startTime: "24:00",
    endTime: "23:00",
    expectedErrorPath: "startTime"
  },
  {
    name: "Missing employee",
    startTime: "09:00",
    endTime: "17:00",
    omitEmployee: true,
    expectedErrorPath: "employee"
  },
  {
    name: "Missing available date",
    startTime: "09:00",
    endTime: "17:00",
    omitDate: true,
    expectedErrorPath: "availableDate"
  }
];

async function runTests() {
  let passed = 0;

  for (const test of testCases) {
    const availability = new Availability({
      employee: test.omitEmployee
        ? undefined
        : new mongoose.Types.ObjectId(),
      availableDate: test.omitDate
        ? undefined
        : new Date("2026-11-16"),
      startTime: test.startTime,
      endTime: test.endTime
    });

    try {
      await availability.validate();

      if (test.expectedErrorPath !== null) {
        console.log(
          `FAIL: ${test.name} - Expected error on ${test.expectedErrorPath}`
        );
        continue;
      }

      console.log(`PASS: ${test.name}`);
      passed++;
    } catch (error) {
      if (!(error instanceof mongoose.Error.ValidationError)) {
        console.log(`FAIL: ${test.name} - Unexpected error: ${error.message}`);
        continue;
      }

      if (test.expectedErrorPath === null) {
        console.log(`FAIL: ${test.name} - Unexpected validation error`);
        continue;
      }

      if (!error.errors[test.expectedErrorPath]) {
        console.log(
          `FAIL: ${test.name} - Expected ${test.expectedErrorPath} error`
        );
        continue;
      }

      console.log(`PASS: ${test.name}`);
      passed++;
    }
  }

  console.log(`\nResult: ${passed}/${testCases.length} tests passed`);

  if (passed !== testCases.length) {
    process.exitCode = 1;
  }
}

runTests();
