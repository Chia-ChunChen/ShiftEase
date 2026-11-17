const Employee = require("../models/Employee");
const availabilityService = require("../services/availabilityService");
const httpError = require("../lib/httpError");

async function ownEmployee(req) {
  const employee = await Employee.findOne({ user: req.user._id }).select("_id");
  if (!employee) throw httpError(409, "Ask your manager to link your employee record first.");
  return employee._id;
}

function availabilityError(error, res) {
  const status = error.statusCode ||
    (error.code === "OVERLAPPING_AVAILABILITY" ? 409 :
      ["ValidationError", "CastError"].includes(error.name) || error.code === "INVALID_AVAILABILITY" ? 400 : 500);
  if (status === 500) console.error("Availability request failed:", error.name);
  return res.status(status).json({
    message: status === 500 ? "Unable to complete the availability request." : error.message
  });
}

async function createAvailabilityController(req, res) {
  try {
    const employee = await ownEmployee(req);
    const [availability] = await availabilityService.createWeeklyAvailability(employee, [req.body]);
    return res.status(201).json({ message: "Availability created successfully.", availability });
  } catch (error) {
    return availabilityError(error, res);
  }
}

async function createWeeklyAvailability(req, res) {
  try {
    const employee = await ownEmployee(req);
    const availability = await availabilityService.createWeeklyAvailability(employee, req.body?.entries);
    return res.status(201).json({ message: "Availability saved.", availability });
  } catch (error) {
    return availabilityError(error, res);
  }
}

async function getAllAvailability(req, res) {
  try {
    const staff = req.user.role !== "Employee";
    const data = await availabilityService.getAllAvailability(staff ? undefined : await ownEmployee(req));
    return res.json({ success: true, message: "Availability retrieved successfully.", data });
  } catch (error) {
    return availabilityError(error, res);
  }
}

module.exports = { createAvailabilityController, createWeeklyAvailability, getAllAvailability };
