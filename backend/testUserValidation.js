const mongoose = require("mongoose");
const User = require("./models/User");

const testCases = [
  {
    name: "Valid manager account",
    data: {
      name: "Test Manager",
      email: "manager@example.com",
      password: "TestPassword123",
      role: "Manager"
    },
    expectedErrorPath: null
  },
  {
    name: "Missing name",
    data: {
      email: "test@example.com",
      password: "TestPassword123",
      role: "Manager"
    },
    expectedErrorPath: "name"
  },
  {
    name: "Missing email",
    data: {
      name: "Test User",
      password: "TestPassword123",
      role: "Manager"
    },
    expectedErrorPath: "email"
  },
  {
    name: "Missing password",
    data: {
      name: "Test User",
      email: "test@example.com",
      role: "Manager"
    },
    expectedErrorPath: "password"
  },
  {
    name: "Invalid user role",
    data: {
      name: "Test User",
      email: "test@example.com",
      password: "TestPassword123",
      role: "Guest"
    },
    expectedErrorPath: "role"
  },
  {
    name: "Invalid email format",
    data: {
      name: "Test User",
      email: "not-an-email",
      password: "TestPassword123",
      role: "Employee"
    },
    expectedErrorPath: "email"
  },
  {
    name: "Administrator role is allowed",
    data: {
      name: "Test Admin",
      email: "admin@example.com",
      password: "TestPassword123",
      role: "Administrator"
    },
    expectedErrorPath: null
  },
  {
    name: "Employee role is allowed",
    data: {
      name: "Test Employee",
      email: "employee@example.com",
      password: "TestPassword123",
      role: "Employee"
    },
    expectedErrorPath: null
  }
];

async function runTests() {
  let passed = 0;

  for (const test of testCases) {
    const user = new User(test.data);

    try {
      await user.validate();

      if (test.expectedErrorPath !== null) {
        console.log(
          `FAIL: ${test.name} - Expected ${test.expectedErrorPath} error`
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

  // Test email lowercase conversion
  const emailUser = new User({
    name: "Test User",
    email: "TEST@EXAMPLE.COM",
    password: "TestPassword123",
    role: "Employee"
  });

  if (emailUser.email === "test@example.com") {
    console.log("PASS: Email converted to lowercase");
    passed++;
  } else {
    console.log("FAIL: Email lowercase conversion");
  }

  // Test password is excluded from normal queries
  const passwordSelected = User.schema.path("password").options.select;

  if (passwordSelected === false) {
    console.log("PASS: Password excluded from normal queries");
    passed++;
  } else {
    console.log("FAIL: Password selection protection");
  }

  // Test password is excluded from JSON serialization
  const jsonUser = new User({
    name: "JSON Test User",
    email: "json@example.com",
    password: "TestPassword123",
    role: "Employee"
  });

  const jsonResult = JSON.parse(JSON.stringify(jsonUser));

  if (jsonResult.password === undefined) {
    console.log("PASS: toJSON does not expose password");
    passed++;
  } else {
    console.log("FAIL: toJSON exposes password");
  }

  console.log(`\nResult: ${passed}/11 tests passed`);

  if (passed !== 11) {
    process.exitCode = 1;
  }
}

runTests();
