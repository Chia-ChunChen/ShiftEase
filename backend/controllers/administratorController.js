
const mongoose = require("mongoose");
const User = require("../models/User");

const {
  createUser,
  findUserById
} = require("../services/userService");

// GET all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    return res.status(200).json({
      message: "Users retrieved successfully.",
      count: users.length,
      users
    });
  } catch (error) {
    console.error("Get all users error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve users."
    });
  }
};

// GET user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user ID."
      });
    }

    const user = await findUserById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    return res.status(200).json({
      message: "User retrieved successfully.",
      user
    });
  } catch (error) {
    console.error("Get user error:", error.message);

    return res.status(500).json({
      message: "Failed to retrieve user."
    });
  }
};

// POST create new user
const createNewUser = async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      temporaryPassword
    } = req.body;

    if (!name || !email || !role || !temporaryPassword) {
      return res.status(400).json({
        message: "Name, email, role and temporary password are required."
      });
    }

    const allowedRoles = [
      "Administrator",
      "Manager",
      "Employee"
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid user role."
      });
    }

    const user = await createUser({
      name,
      email,
      password: temporaryPassword,
      role
    });

    return res.status(201).json({
      message: "User account created successfully.",
      user
    });
  } catch (error) {
    if (error.code === "DUPLICATE_EMAIL") {
      return res.status(409).json({
        message: error.message
      });
    }

    if (error.code === "INVALID_PASSWORD") {
      return res.status(400).json({
        message: error.message
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message
      });
    }

    console.error("Create user error:", error.message);

    return res.status(500).json({
      message: "Failed to create user account."
    });
  }
};

// PUT update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user ID."
      });
    }

    if (!name || !email || !role) {
      return res.status(400).json({
        message: "Name, email and role are required."
      });
    }

    const allowedRoles = [
      "Administrator",
      "Manager",
      "Employee"
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: "Invalid user role."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: id }
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already exists."
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        name,
        email: normalizedEmail,
        role
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    return res.status(200).json({
      message: "User updated successfully.",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update user error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already exists."
      });
    }

    return res.status(400).json({
      message: "Failed to update user."
    });
  }
};

// DELETE user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid user ID."
      });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    return res.status(200).json({
      message: "User account deleted successfully."
    });
  } catch (error) {
    console.error("Delete user error:", error.message);

    return res.status(500).json({
      message: "Failed to delete user."
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createNewUser,
  updateUser,
  deleteUser
};
