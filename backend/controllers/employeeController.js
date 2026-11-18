const mongoose = require("mongoose");
const Employee = require("../models/Employee");
const employeeService = require("../services/employeeService");
const { inAccountTransaction } = require("../services/provisioningService");
const { normalizeEmail } = require("../services/userService");
const httpError = require("../lib/httpError");

async function createEmployee(req, res) {
  try {
    const { employee, temporaryPassword } = await employeeService.createEmployee(req.body);
    return res.status(201).json({
      success: true,
      message: temporaryPassword ? "Employee and login account created." : "Employee linked to the existing account.",
      data: employee,
      temporaryPassword
    });
  } catch (error) {
    if (error.statusCode || error.name === "ValidationError") {
      return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
    console.error("Create employee error:", error.name);
    return res.status(500).json({ success: false, message: "Failed to create employee." });
  }
}

async function getAllEmployees(req, res) {
  const employees = await Employee.find().sort({ name: 1 });
  return res.json({ message: "Employees retrieved successfully.", count: employees.length, employees });
}

function employeeResponse(res, employee, message) {
  if (!employee) return res.status(404).json({ message: "Employee profile not found." });
  return res.json({ message, employee });
}

async function getMyEmployeeProfile(req, res) {
  const employee = await Employee.findOne({ user: req.user._id });
  return employeeResponse(res, employee, "Employee profile retrieved successfully.");
}

async function getEmployeeProfile(req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(400).json({ message: "Invalid employee ID." });
  }
  return employeeResponse(res, await Employee.findById(req.params.id), "Employee profile retrieved successfully.");
}

async function updateEmployeeProfile(req, res) {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) return res.status(400).json({ message: "Invalid employee ID." });

  const { name, email, phone, position } = req.body ?? {};
  const values = { name, email, phone, position };
  for (const [field, value] of Object.entries(values)) {
    if (value === undefined) delete values[field];
    else if (typeof value !== "string" || !value.trim()) {
      return res.status(400).json({ message: `Enter a valid ${field}.` });
    }
  }
  if (!Object.keys(values).length) return res.status(400).json({ message: "Provide an employee field to update." });
  if (email !== undefined) {
    values.email = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      return res.status(400).json({ message: "Invalid email address." });
    }
  }

  try {
    const employee = await inAccountTransaction(async session => {
      const record = await Employee.findById(id).session(session);
      if (!record) return null;
      if (record.user && values.email !== undefined && values.email !== record.email) {
        throw httpError(409, "Change the linked email through Administrator account management.");
      }
      record.set(values);
      return record.save({ session });
    });
    return employeeResponse(res, employee, "Employee profile updated successfully.");
  } catch (error) {
    if (error.statusCode || error.name === "ValidationError") {
      return res.status(error.statusCode || 400).json({ message: error.message });
    }
    throw error;
  }
}

module.exports = { createEmployee, getAllEmployees, getMyEmployeeProfile, getEmployeeProfile, updateEmployeeProfile };
