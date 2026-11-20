const Employee = require("../models/Employee");
const availabilityService = require("../services/availabilityService");
const requestService = require("../services/availabilityRequestService");
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

async function getCurrentAvailability(req, res) {
  try {
    return res.json({ data: await requestService.current(await ownEmployee(req)) });
  } catch (error) { return availabilityError(error, res); }
}

async function getMyRequests(req, res) {
  try {
    return res.json({ data: await requestService.mine(await ownEmployee(req)) });
  } catch (error) { return availabilityError(error, res); }
}

async function submitRequest(req, res) {
  try {
    const { request, created } = await requestService.submit(await ownEmployee(req), req.body);
    return res.status(created ? 201 : 200).json({ data: request });
  } catch (error) { return availabilityError(error, res); }
}

async function getRequests(req, res) {
  try {
    return res.json({ data: await requestService.list(req.query.status) });
  } catch (error) { return availabilityError(error, res); }
}

async function approveRequest(req, res) {
  try {
    return res.json({ data: await requestService.approve(req.params.id, req.user._id) });
  } catch (error) { return availabilityError(error, res); }
}

module.exports = { createAvailabilityController, createWeeklyAvailability, getAllAvailability,
  getCurrentAvailability, getMyRequests, submitRequest, getRequests, approveRequest };
