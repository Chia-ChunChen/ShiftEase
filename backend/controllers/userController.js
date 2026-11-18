const Employee = require("../models/Employee");
const User = require("../models/User");
const { authenticate, changePassword, toSafeUser } = require("../services/userService");
const { provisionAccount } = require("../services/provisioningService");
const { startSession, endSession, clearSessionCookie } = require("../middleware/auth");

function accountError(error, res) {
  if (error.statusCode || error.name === "ValidationError") {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }
  console.error("Account request failed:", error.name);
  return res.status(500).json({ message: "Unable to complete the account request." });
}

async function login(req, res) {
  const { email, password } = req.body ?? {};
  const user = await authenticate(email, password);
  if (!user) return res.status(401).json({ message: "Invalid email or password." });
  const employee = user.role === "Employee"
    ? await Employee.findOne({ user: user._id }).select("_id")
    : null;
  const token = await startSession(res, user);
  return res.json({
    message: "Login successful.",
    user: { ...toSafeUser(user), id: user._id },
    employeeId: employee?._id ?? null,
    token
  });
}

async function logout(req, res) {
  await endSession(req, res);
  return res.status(204).end();
}

async function getProfile(req, res) {
  const employee = req.user.role === "Employee"
    ? await Employee.findOne({ user: req.user._id }).select("name email phone position")
    : null;
  return res.json({ user: toSafeUser(req.user), employee });
}

async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body ?? {};
    await changePassword(req.user._id, currentPassword, newPassword);
    clearSessionCookie(res);
    return res.status(204).end();
  } catch (error) {
    return accountError(error, res);
  }
}

async function createAccount(req, res) {
  try {
    const { name, email, role, temporaryPassword } = req.body ?? {};
    const account = await provisionAccount({ name, email, role, temporaryPassword });
    return res.status(201).json({ message: "Account created successfully.", ...account });
  } catch (error) {
    return accountError(error, res);
  }
}

async function listAccounts(req, res) {
  const users = await User.find().select("name email role mustChangePassword").sort({ name: 1 });
  return res.json({ users });
}

module.exports = { login, logout, getProfile, updatePassword, createAccount, listAccounts };
