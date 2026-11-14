
const employeeService = require("../services/employeeService");

// Create a new employee
const createEmployee = async (req, res) => {
  try {
    // Get employee data from request body
    const employeeData = req.body;

    // Call service to create employee
    const newEmployee =
      await employeeService.createEmployee(employeeData);

    // Return success response
    res.status(201).json({
      success: true,
      message: "Employee created successfully.",
      data: newEmployee
    });

  } catch (error) {
    // Handle validation and duplicate email errors
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    // Handle unexpected errors
    console.error("Create employee error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create employee."
    });
  }
};

module.exports = {
  createEmployee
};
