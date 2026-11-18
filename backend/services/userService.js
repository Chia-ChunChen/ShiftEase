const bcrypt = require("bcryptjs");
const User = require("../models/User");
const httpError = require("../lib/httpError");

const SALT_ROUNDS = 10;
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const ROLES = ["Administrator", "Manager", "Employee"];

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isValidPassword(password) {
  return typeof password === "string" && PASSWORD_RULE.test(password) &&
    Buffer.byteLength(password, "utf8") <= 72;
}

function toSafeUser(userDoc) {
  const user = userDoc.toObject();
  delete user.password;
  delete user.sessionVersion;
  return user;
}

async function hashPassword(password) {
  if (!isValidPassword(password)) {
    const error = httpError(400, "Use 8 to 72 bytes with at least one letter and one number.");
    error.code = "INVALID_PASSWORD";
    throw error;
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function createUser({ name, email, password, role, mustChangePassword = false }, session) {
  if (typeof name !== "string" || !name.trim() || !normalizeEmail(email) || !ROLES.includes(role)) {
    throw httpError(400, "A name, valid email, and supported role are required.");
  }
  const passwordHash = await hashPassword(password);

  try {
    await User.init();
    const values = { name, email: normalizeEmail(email), password: passwordHash, role, mustChangePassword };
    const [user] = await User.create([values], { session });
    return toSafeUser(user);
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = httpError(409, "An account with this email already exists.");
      duplicate.code = "DUPLICATE_EMAIL";
      throw duplicate;
    }
    throw error;
  }
}

async function findUserById(id) {
  const user = await User.findById(id);
  return user ? toSafeUser(user) : null;
}

async function authenticate(email, password) {
  if (!normalizeEmail(email) || typeof password !== "string" ||
      Buffer.byteLength(password, "utf8") > 72) return null;

  const user = await User.findOne({ email: normalizeEmail(email) }).select("+password");
  if (!user) return null;
  return await bcrypt.compare(password, user.password) ? user : null;
}

async function verifyPassword(email, plainPassword) {
  return Boolean(await authenticate(email, plainPassword));
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId).select("+password");
  if (!user || typeof currentPassword !== "string" ||
      Buffer.byteLength(currentPassword, "utf8") > 72 ||
      !(await bcrypt.compare(currentPassword, user.password))) {
    throw httpError(400, "The current password is incorrect.");
  }
  if (currentPassword === newPassword) {
    throw httpError(400, "Choose a different password.");
  }
  const password = await hashPassword(newPassword);
  const result = await User.updateOne(
    { _id: user._id, password: user.password },
    { $set: { password, mustChangePassword: false }, $inc: { sessionVersion: 1 } }
  );
  if (!result.matchedCount) throw httpError(409, "The password changed. Sign in again.");
}

module.exports = {
  createUser, findUserById, verifyPassword, isValidPassword,
  normalizeEmail, authenticate, changePassword, toSafeUser
};
