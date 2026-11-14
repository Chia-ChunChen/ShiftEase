const bcrypt = require("bcryptjs");
const User = require("../models/User");

const SALT_ROUNDS = 10;

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

function isValidPassword(password) {
  return (
    typeof password === "string" &&
    PASSWORD_RULE.test(password) &&
    Buffer.byteLength(password, "utf8") <= 72
  );
}

function toSafeUser(userDoc) {
  const user = userDoc.toObject();
  delete user.password;
  return user;
}

async function createUser({ name, email, password, role }) {
  if (!isValidPassword(password)) {
    const error = new Error(
      "Password must be at least 8 characters and include a letter and a number."
    );
    error.code = "INVALID_PASSWORD";
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    await User.init();

    const user = await User.create({
      name,
      email,
      password: passwordHash,
      role
    });

    return toSafeUser(user);
  } catch (error) {
    if (error.code === 11000) {
      const duplicate = new Error(
        "An account with this email already exists."
      );
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

async function verifyPassword(email, plainPassword) {
  const user = await User.findOne({ email }).select("+password");

  if (!user) return false;

  return bcrypt.compare(plainPassword, user.password);
}

module.exports = {
  createUser,
  findUserById,
  verifyPassword,
  isValidPassword
};
