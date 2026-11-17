
const mongoose = require("mongoose");
const Employee = require("../models/Employee");

// GET all employees
const getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find();

    return res.status(200).json({
      message: "Employees retrieved successfully.",
      count: employees.length,
      employees
    });
  } catch (error) {
    console.error("Get all employees error:", error);

    return res.status(500).json({
      message: "Failed to retrieve employees."
    });
  }
};

// GET my employee profile
const getMyEmployeeProfile = async (req, res) => {
  try {
    const employee = await Employee.findOne({
      user: req.user.userId
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee profile not found."
      });
    }

    return res.status(200).json({
      message: "Employee profile retrieved successfully.",
      employee
    });
  } catch (error) {
    console.error("Get my employee profile error:", error);

    return res.status(500).json({
      message: "Failed to retrieve employee profile."
    });
  }
};

// GET employee by ID
const getEmployeeProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid employee ID."
      });
    }

    const employee = await Employee.findById(id);

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found."
      });
    }

    return res.status(200).json({
      message: "Employee profile retrieved successfully.",
      employee
    });
  } catch (error) {
    console.error("Get employee profile error:", error);

    return res.status(500).json({
      message: "Failed to retrieve employee profile."
    });
  }
};

// PUT update employee profile
const updateEmployeeProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, position } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid employee ID."
      });
    }

    const employee = await Employee.findByIdAndUpdate(
      id,
      { name, email, phone, position },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found."
      });
    }

    return res.status(200).json({
      message: "Employee profile updated successfully.",
      employee
    });
  } catch (error) {
    console.error("Update employee profile error:", error);

    return res.status(400).json({
      message: "Failed to update employee profile."
    });
  }
};

module.exports = {
  getAllEmployees,
  getMyEmployeeProfile,
  getEmployeeProfile,
  updateEmployeeProfile
};
