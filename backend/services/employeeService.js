const { provisionEmployee } = require("./provisioningService");
const { normalizeEmail } = require("./userService");
const httpError = require("../lib/httpError");

async function createEmployee(employeeData) {
  const { name, email, phone, position } = employeeData ?? {};
  if ([name, email, phone, position].some(value => typeof value !== "string" || !value.trim())) {
    throw httpError(400, "All employee fields are required.");
  }
  const normalizedEmail = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw httpError(400, "Invalid email format.");
  }
  if (!/^\+?[\d\s()-]{7,20}$/.test(phone.trim()) || phone.replace(/\D/g, "").length < 7) {
    throw httpError(400, "Invalid phone number.");
  }
  return provisionEmployee({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone.trim(),
    position: position.trim()
  });
}

module.exports = { createEmployee };
