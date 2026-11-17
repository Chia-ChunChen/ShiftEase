const { randomBytes } = require("node:crypto");
const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const User = require("../models/User");
const { createUser, normalizeEmail } = require("./userService");
const httpError = require("../lib/httpError");

async function inAccountTransaction(work) {
  await Promise.all([Employee.init(), User.init()]);
  try {
    return await mongoose.connection.transaction(work);
  } catch (error) {
    if (error.code === 11000) {
      throw httpError(409, "This employee or account already exists. Review the email and try again.");
    }
    throw error;
  }
}

async function createTemporaryAccount(details, session) {
  // The prefix guarantees that the generated value satisfies the password rules.
  const temporaryPassword = details.temporaryPassword === undefined || details.temporaryPassword === ""
    ? "A1" + randomBytes(18).toString("base64url")
    : details.temporaryPassword;
  const user = await createUser({
    name: details.name,
    email: details.email,
    role: details.role,
    password: temporaryPassword,
    mustChangePassword: true
  }, session);
  return { user, temporaryPassword };
}

async function provisionEmployee(details) {
  return inAccountTransaction(async session => {
    let employee = await Employee.findOne({ email: details.email }).session(session);
    if (employee?.user) throw httpError(409, "The employee already has a linked account.");

    let user = await User.findOne({ email: details.email }).session(session);
    if (user && user.role !== "Employee") {
      throw httpError(409, "This email belongs to a non-employee account.");
    }

    let temporaryPassword;
    if (!user) {
      ({ user, temporaryPassword } = await createTemporaryAccount({
        ...details, role: "Employee"
      }, session));
    }

    if (employee) {
      employee.user = user._id;
      await employee.save({ session });
    } else {
      [employee] = await Employee.create([{ ...details, user: user._id }], { session });
    }
    return { employee, temporaryPassword };
  });
}

async function provisionAccount(details) {
  const email = normalizeEmail(details.email);
  return inAccountTransaction(async session => {
    const employee = await Employee.findOne({ email }).session(session);
    if (employee && (details.role !== "Employee" || employee.user)) {
      throw httpError(409, "This email belongs to an employee record or is already linked.");
    }
    const account = await createTemporaryAccount({ ...details, email }, session);
    if (employee) {
      employee.user = account.user._id;
      await employee.save({ session });
    }
    return account;
  });
}

module.exports = { provisionEmployee, provisionAccount };
