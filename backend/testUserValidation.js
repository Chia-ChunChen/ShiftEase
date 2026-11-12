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
    shouldPass: true
  },
  {
    name: "Missing name",
    data: {
      email: "test@example.com",
      password: "TestPassword123",
      role: "Manager"
    },
    shouldPass: false
  },
  {
    name: "Missing email",
    data: {
      name: "Test User",
      password: "TestPassword123",
      role: "Manager"
    },
    shouldPass: false
  },
  {
    name: "Missing password",
    data: {
      name: "Test User",
      email: "test@example.com",
      role: "Manager"
    },
    shouldPass: false
  },
  {
    name: "Invalid user role",
    data: {
      name: "Test User",
      email: "test@example.com",
      password: "TestPassword123",
      role: "Guest"
    },
    shouldPass: false
  }
];

async function runTests() {
  let passed = 0;

  for (const test of testCases) {
    const user = new User(test.data);
    let actualPass = true;

    try {
      await user.validate();
    } catch (error) {
      actualPass = false;
    }

    if (actualPass === test.shouldPass) {
      console.log(`PASS: ${test.name}`);
      passed++;
    } else {
      console.log(`FAIL: ${test.name}`);
    }
  }

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

  const passwordSelected =
    User.schema.path("password").options.select;

  if (passwordSelected === false) {
    console.log("PASS: Password excluded from normal queries");
    passed++;
  } else {
    console.log("FAIL: Password selection protection");
  }

  console.log(`\nResult: ${passed}/7 tests passed`);

  if (passed !== 7) {
    process.exitCode = 1;
  }
}

runTests();
