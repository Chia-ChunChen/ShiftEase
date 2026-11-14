
const Employee = require("../models/Employee");

// Create a new employee
const createEmployee = async (employeeData) => {
  const { name, email, phone, position } = employeeData || {};

  // Validate required fields
  if (
    [name, email, phone, position].some(
      (value) =>
        typeof value !== "string" || !value.trim()
    )
  ) {
    const error = new Error("All employee fields are required.");
    error.statusCode = 400;
    throw error;
  }

  // Validate email format
  const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailFormat.test(email.trim())) {
    const error = new Error("Invalid email format.");
    error.statusCode = 400;
    throw error;
  }

  // Validate phone format
  const phoneFormat = /^\+?[\d\s()-]{7,20}$/;

  if (
    !phoneFormat.test(phone.trim()) ||
    phone.replace(/\D/g, "").length < 7
  ) {
    const error = new Error("Invalid phone number.");
    error.statusCode = 400;
    throw error;
  }

  // Check duplicate email
  const normalizedEmail = email.trim().toLowerCase();

  const existingEmployee = await Employee.findOne({
    email: normalizedEmail
  });

  if (existingEmployee) {
    const error = new Error("Employee email already exists.");
    error.statusCode = 409;
    throw error;
  }

  // Save employee to MongoDB
  try {
    const newEmployee = await Employee.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      position: position.trim()
    });

    return newEmployee;
  } catch (error) {
    // Handle duplicate email from MongoDB
    if (error.code === 11000) {
      const duplicateError = new Error(
        "Employee email already exists."
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
};

module.exports = {
  createEmployee
};
