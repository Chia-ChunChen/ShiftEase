
require("dotenv").config({
  path: require("node:path").join(__dirname, ".env")
});

const connectDB = require("./config/db");
const User = require("./models/User");
const Employee = require("./models/Employee");

const APPLY_CHANGES = false; // 第一次先維持 false，確認結果後才改成 true

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

async function migrateEmployeeUsers() {
  try {
    await connectDB();

    const users = await User.find({ role: "Employee" }).select("_id email");
    const employees = await Employee.find().select("_id email user");

    const userMap = new Map();
    const employeeEmailCount = new Map();

    for (const user of users) {
      const email = normalizeEmail(user.email);
      if (!email) continue;

      if (userMap.has(email)) {
        throw new Error(`Duplicate User email found: ${email}`);
      }

      userMap.set(email, user);
    }

    for (const employee of employees) {
      const email = normalizeEmail(employee.email);
      if (email) {
        employeeEmailCount.set(
          email,
          (employeeEmailCount.get(email) || 0) + 1
        );
      }
    }

    let matched = 0;
    let alreadyLinked = 0;
    let unmatched = 0;
    let duplicate = 0;

    for (const employee of employees) {
      const email = normalizeEmail(employee.email);

      if (!email) {
        unmatched++;
        console.log(`Missing email: Employee ${employee._id}`);
        continue;
      }

      if (employeeEmailCount.get(email) > 1) {
        duplicate++;
        console.log(`Duplicate Employee email: ${email}`);
        continue;
      }

      const user = userMap.get(email);

      if (!user) {
        unmatched++;
        console.log(`No matching User: ${email}`);
        continue;
      }

      if (employee.user) {
        if (employee.user.toString() === user._id.toString()) {
          alreadyLinked++;
          continue;
        }

        throw new Error(
          `Employee ${employee._id} is already linked to another User.`
        );
      }

      matched++;

      console.log(
        `Match found: ${email} | Employee: ${employee._id} | User: ${user._id}`
      );

      if (APPLY_CHANGES) {
        employee.user = user._id;
        await employee.save();
      }
    }

    console.log("\nMigration summary:");
    console.log(`Matched: ${matched}`);
    console.log(`Already linked: ${alreadyLinked}`);
    console.log(`Unmatched: ${unmatched}`);
    console.log(`Duplicate Employee emails: ${duplicate}`);
    console.log(`Changes applied: ${APPLY_CHANGES}`);

  } catch (error) {
    console.error("Migration failed:", error.message);
  } finally {
    const mongoose = require("mongoose");
    await mongoose.disconnect();
  }
}

migrateEmployeeUsers();
