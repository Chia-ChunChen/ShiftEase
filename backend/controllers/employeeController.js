const employeeService = require("../services/employeeService");

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

module.exports = { createEmployee };
