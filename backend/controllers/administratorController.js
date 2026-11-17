const mongoose = require("mongoose");
const User = require("../models/User");
const Employee = require("../models/Employee");
const Session = require("../models/Session");
const { findUserById, normalizeEmail } = require("../services/userService");
const { inAccountTransaction } = require("../services/provisioningService");
const { createAccount } = require("./userController");
const httpError = require("../lib/httpError");

function validId(req, res) {
  if (mongoose.isObjectIdOrHexString(req.params.id)) return true;
  res.status(400).json({ message: "Invalid user ID." });
  return false;
}

function userNotFound(res) {
  return res.status(404).json({ message: "User not found." });
}

function validationError(error, res) {
  if (!error.statusCode && error.name !== "ValidationError") throw error;
  return res.status(error.statusCode || 400).json({ message: error.message });
}

async function getAllUsers(req, res) {
  const users = await User.find().sort({ name: 1 });
  return res.json({ message: "Users retrieved successfully.", count: users.length, users });
}

async function getUserById(req, res) {
  if (!validId(req, res)) return;
  const user = await findUserById(req.params.id);
  if (!user) return userNotFound(res);
  return res.json({ message: "User retrieved successfully.", user });
}

async function updateUser(req, res) {
  if (!validId(req, res)) return;
  const { name, email, role } = req.body ?? {};
  const normalizedEmail = normalizeEmail(email);
  if (typeof name !== "string" || !name.trim() || !normalizedEmail ||
      !User.schema.path("role").enumValues.includes(role)) {
    return res.status(400).json({ message: "A name, email and valid role are required." });
  }

  try {
    const user = await inAccountTransaction(async session => {
      const account = await User.findById(req.params.id).session(session);
      if (!account) return null;
      const employee = await Employee.findOne({ user: account._id }).session(session);
      if (employee && role !== "Employee") {
        throw httpError(409, "A linked employee account must keep the Employee role.");
      }

      if (account.email !== normalizedEmail) {
        const filter = { email: normalizedEmail };
        if (employee) filter._id = { $ne: employee._id };
        if (await Employee.exists(filter).session(session)) {
          throw httpError(409, "That email belongs to another employee record.");
        }
      }
      if (account.email !== normalizedEmail || account.role !== role) {
        account.sessionVersion = (account.sessionVersion ?? 0) + 1;
      }
      account.set({ name, email: normalizedEmail, role });
      await account.save({ session });
      if (employee && employee.email !== normalizedEmail) {
        employee.email = normalizedEmail;
        await employee.save({ session });
      }
      return account;
    });
    if (!user) return userNotFound(res);
    return res.json({ message: "User updated successfully.", user });
  } catch (error) {
    return validationError(error, res);
  }
}

async function deleteUser(req, res) {
  if (!validId(req, res)) return;
  try {
    const deleted = await inAccountTransaction(async session => {
      const id = req.params.id;
      const account = await User.findByIdAndDelete(id, { session });
      if (!account) return false;
      await Employee.updateOne({ user: id }, { $unset: { user: 1 } }, { session });
      await Session.deleteMany({ user: id }, { session });
      return true;
    });
    if (!deleted) return userNotFound(res);
    return res.json({ message: "User account deleted successfully." });
  } catch (error) {
    return validationError(error, res);
  }
}

module.exports = { getAllUsers, getUserById, createNewUser: createAccount, updateUser, deleteUser };
