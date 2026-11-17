
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Employee = require("../models/Employee");

const {
  createUser,
  verifyPassword
} = require("../services/userService");

// POST register Employee
const createUserController = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    const user = await createUser({
      name,
      email: email.trim().toLowerCase(),
      password,
      role: "Employee"
    });

    return res.status(201).json({
      message: "User created successfully.",
      user
    });

  } catch (error) {
    if (error.code === "DUPLICATE_EMAIL") {
      return res.status(409).json({
        message: error.message
      });
    }

    if (error.code === "INVALID_PASSWORD" ||
        error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message
      });
    }

    console.error("Create user error:", error);

    return res.status(500).json({
      message: "Unable to create user."
    });
  }
};

// POST login
const loginUserController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const isPasswordValid = await verifyPassword(
      normalizedEmail,
      password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    let employeeId = null;

    if (user.role === "Employee") {
      const employee = await Employee.findOne({
        user: user._id
      });

      if (!employee) {
        return res.status(404).json({
          message: "Employee profile not found. Contact administrator."
        });
      }

      employeeId = employee._id;
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d"
      }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      employeeId
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Unable to login."
    });
  }
};

module.exports = {
  createUserController,
  loginUserController
};
