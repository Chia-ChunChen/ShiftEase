const mongoose = require("mongoose");
const Availability = require("./models/Availability");

const testCases = [
  {
    name: "Valid working hours",
    startTime: "09:00",
    endTime: "17:00",
    shouldPass: true
  },
  {
    name: "Invalid start time",
    startTime: "25:90",
    endTime: "17:00",
    shouldPass: false
  },
  {
    name: "Invalid end time",
    startTime: "09:00",
    endTime: "25:90",
    shouldPass: false
  },
  {
    name: "End time earlier than start time",
    startTime: "17:00",
    endTime: "09:00",
    shouldPass: false
  },
  {
    name: "End time equal to start time",
    startTime: "09:00",
    endTime: "09:00",
    shouldPass: false
  }
];

async function runTests() {
  let passed = 0;

  for (const test of testCases) {
    const availability = new Availability({
      employee: new mongoose.Types.ObjectId(),
      availableDate: new Date("2026-11-16"),
      startTime: test.startTime,
      endTime: test.endTime
    });

    try {
      await availability.validate();

      if (!test.shouldPass) {
        console.log(`FAIL: ${test.name}`);
        continue;
      }

      console.log(`PASS: ${test.name}`);
      passed++;
    } catch (error) {
      if (test.shouldPass) {
        console.log(`FAIL: ${test.name} - ${error.message}`);
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
